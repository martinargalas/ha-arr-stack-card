import { FLAT_SVG_FLAGS } from './media-cards.js';
import { FLAG_SVGS } from './flag-svgs.js';

// What a poster says about its file: language flags, subtitles, quality. Split out of render/media-cards.js.

class _PosterFlagsMethods {

// Country whose flag stands in for a spoken language. English is the awkward
// one: the track is just "English", with no region, so the flag is a stand-in
// either way. Installs that set their country to the US get the US flag, since
// that is the one their users read as English; everyone else keeps GB.
_flagCountry(lang) {
  const code = (lang || '').toUpperCase();
  if (code === 'EN' && this._hass?.config?.country === 'US') return 'US';
  const MAP = {
    CS: 'CZ', EN: 'GB', DE: 'DE', FR: 'FR', ES: 'ES', IT: 'IT', PL: 'PL',
    SK: 'SK', RU: 'RU', JA: 'JP', KO: 'KR', ZH: 'CN', PT: 'PT', NL: 'NL',
    SV: 'SE', NO: 'NO', DA: 'DK', FI: 'FI', HU: 'HU', RO: 'RO', UK: 'UA',
    TR: 'TR', AR: 'SA', HI: 'IN', HR: 'HR', SR: 'RS', BG: 'BG', EL: 'GR',
    HE: 'IL', TH: 'TH', VI: 'VN', ID: 'ID', FA: 'IR', MS: 'MY', ET: 'EE',
    LV: 'LV', LT: 'LT', SL: 'SI', CA: 'ES', IS: 'IS',
  };
  if (MAP[code]) return MAP[code];
  return (FLAG_SVGS[code] || this._flagSpecs[code]) ? code : null;
}

// Regional-indicator pair — no image assets, no network, and Chrome renders
// these natively.
_flagEmoji(lang) {
  const cc = this._flagCountry(lang);
  if (!cc) return '';
  return String.fromCodePoint(...[...cc].map(c => 0x1f1e6 + c.charCodeAt(0) - 65));
}

// Audio/subtitle codes for a title that exists in Radarr or Sonarr. Discover
// and calendar cards only have a TMDB record, so they resolve their *arr entry
// first and hand it here; nothing is shown when the title is not in the library.
// `force` ignores the poster toggles — those govern what a poster is cluttered
// with, and the detail popup is where someone went looking for exactly this.
_arrLangCodes(entry, isMovie, { force = false } = {}) {
  const _pc = this._posterCfg();
  const pc = force ? { ..._pc, audio: true, subtitles: true } : _pc;
  const out = { audioCodes: [], subCodes: [] };
  if (!entry || !entry.id) return out;
  if (isMovie) {
    if (pc.audio && entry.hasFile) {
      if (Array.isArray(entry.movieFile?.languages) && entry.movieFile.languages.length) {
        out.audioCodes = entry.movieFile.languages.map(l => this._langCode(l.name || '')).filter(Boolean);
      } else if (entry.movieFile?.mediaInfo?.audioLanguages) {
        out.audioCodes = entry.movieFile.mediaInfo.audioLanguages.split(/\s*[\/,]\s*/).map(l => this._langCode(l.trim())).filter(Boolean);
      }
    }
    // Only subtitles that exist, and only once the file does — a flag claims a
    // language is present, while Bazarr also tracks what is still missing, for
    // titles that have not been downloaded at all.
    if (pc.subtitles && this._bazarrConfigured && entry.hasFile) {
      const bz = this._bazarr?.[entry.id];
      out.subCodes = (bz?.subtitles || []).map(s => (s.code2 || s.name || '?').toUpperCase());
    }
    return out;
  }
  // Shows keep their audio on the episode files, fetched lazily and cached
  const inst = entry._isSonarr2 ? '2' : '1';
  if ((entry.statistics?.episodeFileCount || 0) > 0) {
    if (pc.audio) {
      const cached = this._libTvAudioCache.get(`${inst}-${entry.id}`);
      if (Array.isArray(cached) && cached.length) out.audioCodes = cached;
      else if (cached === undefined) this._fetchLibTvAudio(entry.id, inst);
    }
    const subs = this._tvSubInfo(entry.id, inst, force);
    if (subs && !subs.missing) out.subCodes = subs.codes;
  }
  return out;
}

// Radarr and Sonarr name a file's quality as source plus resolution
// ("Bluray-1080p", "WEBDL-2160p", "Bluray-2160p Remux"). Marketing labels like
// "Full HD" are avoided on purpose: they cover two resolutions at once and drop
// the source, which is the half that decides how good the file actually is —
// a Remux and a WEB-DL are both 1080p and nowhere near each other.
_qualityLabel(entry, isMovie) {
  const file = isMovie
    ? (entry?.hasFile ? entry.movieFile : null)
    : (entry?.id ? this._sonarrEpFiles?.[entry.id] : null);
  const q = file?.quality?.quality;
  if (!q) return '';
  const res = Number(q.resolution) || 0;
  const resLbl = res >= 2160 ? '4K'
               : res >= 1080 ? '1080p'
               : res >= 720  ? '720p'
               : res > 0     ? 'SD'
               : '';
  const name = String(q.name || '');
  const src = /remux/i.test(name) ? 'Remux'
            : /bluray|bd/i.test(name) ? 'BluRay'
            : /web/i.test(name) ? 'WEB'
            : /hdtv|sdtv|tv/i.test(name) ? 'TV'
            : /dvd/i.test(name) ? 'DVD'
            : '';
  if (resLbl && src) return `${resLbl} · ${src}`;
  return resLbl || src || name;
}

// A show's subtitle languages, aggregated across its episodes. Bazarr is a
// single instance keyed by Sonarr's own ids, so this covers instance 1 only.
_tvSubInfo(seriesId, inst = '1', force = false) {
  const pc = this._posterCfg();
  if ((!pc.subtitles && !force) || !this._bazarrConfigured || inst !== '1' || !seriesId) return null;
  const cached = this._libTvSubCache?.get(String(seriesId));
  if (cached === undefined) { this._fetchLibTvSubs(seriesId); return null; }
  return cached || null;
}

// Rating plus language info, in whichever of the two layouts is configured.
// The audio/subtitle toggles are applied upstream by whoever fills subCodes and
// audioCodes, so switching them off drops the matching side of the strip.
_ratingLangBlock(ratingObj, { subCodes = [], audioCodes = [], subBadge = '', audioBadge = '', extraBadge = '', showRating = true } = {}) {
  const pc = this._posterCfg();
  const wantRating = showRating && pc.rating && ratingObj;
  if ((pc.langDisplay || 'flags') !== 'tags') {
    return this._flagStrip(subCodes, audioCodes, wantRating ? this._ratingBadge(ratingObj, true, true) : '')
      + (extraBadge ? `<div style="display:flex;justify-content:flex-start;gap:3px;flex-wrap:wrap;margin-bottom:3px">${extraBadge}</div>` : '');
  }
  const row = (audioBadge || subBadge || extraBadge)
    ? `<div style="display:flex;justify-content:flex-start;gap:3px;flex-wrap:wrap;margin-bottom:3px">${audioBadge}${subBadge}${extraBadge}</div>`
    : '';
  return (wantRating ? this._ratingBadge(ratingObj) : '') + row;
}

// Flat SVG flags. Emoji flags are drawn as waving cloth on Apple platforms and
// flat on Android, so they can neither be made rectangular nor kept consistent
// — these are rendered instead, with emoji kept only as a fallback for
// countries not covered here.
//
// Most flags are plain stripes, so those are declared as colour lists; the rest
// carry their own markup. viewBox is 30x20 throughout.
get _flagSpecs() {
  const nordic = (bg, cross, inner) => ({ raw:
    `<rect width="30" height="20" fill="${bg}"/>` +
    `<rect x="9" y="0" width="4" height="20" fill="${cross}"/>` +
    `<rect x="0" y="8" width="30" height="4" fill="${cross}"/>` +
    (inner ? `<rect x="10" y="0" width="2" height="20" fill="${inner}"/><rect x="0" y="9" width="30" height="2" fill="${inner}"/>` : '')
  });
  return {
    // ── stripes ──
    DE: { h: ['#000000', '#dd0000', '#ffce00'] },
    NL: { h: ['#ae1c28', '#ffffff', '#21468b'] },
    RU: { h: ['#ffffff', '#0039a6', '#d52b1e'] },
    AT: { h: ['#ed2939', '#ffffff', '#ed2939'] },
    HU: { h: ['#cd2a3e', '#ffffff', '#436f4d'] },
    BG: { h: ['#ffffff', '#00966e', '#d62612'] },
    LT: { h: ['#fdb913', '#006a44', '#c1272d'] },
    EE: { h: ['#0072ce', '#000000', '#ffffff'] },
    IR: { h: ['#239f40', '#ffffff', '#da0000'] },
    ID: { h: ['#ff0000', '#ffffff'] },
    UA: { h: ['#0057b7', '#ffd700'] },
    PL: { h: ['#ffffff', '#dc143c'] },
    FR: { v: ['#002395', '#ffffff', '#ed2939'] },
    IT: { v: ['#009246', '#ffffff', '#ce2b37'] },
    RO: { v: ['#002b7f', '#fcd116', '#ce1126'] },
    BE: { v: ['#000000', '#fdda24', '#ef3340'] },
    // ── nordic crosses ──
    DK: nordic('#c8102e', '#ffffff'),
    SE: nordic('#006aa7', '#fecc00'),
    NO: nordic('#ba0c2f', '#ffffff', '#00205b'),
    FI: nordic('#ffffff', '#003580'),
    IS: nordic('#02529c', '#ffffff', '#dc1e35'),
    // ── the rest ──
    CZ: { raw: `<rect width="30" height="10" fill="#ffffff"/><rect y="10" width="30" height="10" fill="#d7141a"/><path d="M0 0 L15 10 L0 20 Z" fill="#11457e"/>` },
    SK: { raw: `<rect width="30" height="6.67" fill="#ffffff"/><rect y="6.67" width="30" height="6.67" fill="#0b4ea2"/><rect y="13.34" width="30" height="6.66" fill="#ee1c25"/><path d="M6 5.5h6v6.2c0 2-3 3.3-3 3.3s-3-1.3-3-3.3z" fill="#ee1c25" stroke="#ffffff" stroke-width="0.8"/>` },
    US: { raw: `<rect width="30" height="20" fill="#ffffff"/><rect y="0.0" width="30" height="1.54" fill="#b22234"/><rect y="3.08" width="30" height="1.54" fill="#b22234"/><rect y="6.15" width="30" height="1.54" fill="#b22234"/><rect y="9.23" width="30" height="1.54" fill="#b22234"/><rect y="12.31" width="30" height="1.54" fill="#b22234"/><rect y="15.38" width="30" height="1.54" fill="#b22234"/><rect y="18.46" width="30" height="1.54" fill="#b22234"/><rect width="12" height="10.77" fill="#3c3b6e"/><circle cx="1.3" cy="1.2" r="0.5" fill="#ffffff"/><circle cx="3.65" cy="1.2" r="0.5" fill="#ffffff"/><circle cx="6.0" cy="1.2" r="0.5" fill="#ffffff"/><circle cx="8.35" cy="1.2" r="0.5" fill="#ffffff"/><circle cx="10.7" cy="1.2" r="0.5" fill="#ffffff"/><circle cx="1.3" cy="3.8" r="0.5" fill="#ffffff"/><circle cx="3.65" cy="3.8" r="0.5" fill="#ffffff"/><circle cx="6.0" cy="3.8" r="0.5" fill="#ffffff"/><circle cx="8.35" cy="3.8" r="0.5" fill="#ffffff"/><circle cx="10.7" cy="3.8" r="0.5" fill="#ffffff"/><circle cx="1.3" cy="6.4" r="0.5" fill="#ffffff"/><circle cx="3.65" cy="6.4" r="0.5" fill="#ffffff"/><circle cx="6.0" cy="6.4" r="0.5" fill="#ffffff"/><circle cx="8.35" cy="6.4" r="0.5" fill="#ffffff"/><circle cx="10.7" cy="6.4" r="0.5" fill="#ffffff"/><circle cx="1.3" cy="9.0" r="0.5" fill="#ffffff"/><circle cx="3.65" cy="9.0" r="0.5" fill="#ffffff"/><circle cx="6.0" cy="9.0" r="0.5" fill="#ffffff"/><circle cx="8.35" cy="9.0" r="0.5" fill="#ffffff"/><circle cx="10.7" cy="9.0" r="0.5" fill="#ffffff"/>` },
    GB: { raw: `<rect width="30" height="20" fill="#012169"/><path d="M0 0L30 20M30 0L0 20" stroke="#ffffff" stroke-width="4"/><path d="M0 0L30 20M30 0L0 20" stroke="#c8102e" stroke-width="2"/><path d="M15 0v20M0 10h30" stroke="#ffffff" stroke-width="6.5"/><path d="M15 0v20M0 10h30" stroke="#c8102e" stroke-width="4"/>` },
    ES: { raw: `<rect width="30" height="20" fill="#aa151b"/><rect y="5" width="30" height="10" fill="#f1bf00"/>` },
    PT: { raw: `<rect width="30" height="20" fill="#ff0000"/><rect width="12" height="20" fill="#006600"/><circle cx="12" cy="10" r="4" fill="#ffff00" stroke="#ff0000" stroke-width="0.8"/>` },
    JP: { raw: `<rect width="30" height="20" fill="#ffffff"/><circle cx="15" cy="10" r="5.5" fill="#bc002d"/>` },
    CN: { raw: `<rect width="30" height="20" fill="#de2910"/><path d="M5 3l1.2 3.6L3.2 4.4h3.6L3.8 6.6z" fill="#ffde00"/><circle cx="10" cy="2.5" r="0.9" fill="#ffde00"/><circle cx="12" cy="5" r="0.9" fill="#ffde00"/><circle cx="12" cy="8.5" r="0.9" fill="#ffde00"/><circle cx="10" cy="11" r="0.9" fill="#ffde00"/>` },
    KR: { raw: `<rect width="30" height="20" fill="#ffffff"/><circle cx="15" cy="10" r="5" fill="#cd2e3a"/><path d="M15 5a5 5 0 0 0 0 10 2.5 2.5 0 0 1 0-5 2.5 2.5 0 0 0 0-5z" fill="#0047a0"/><g fill="#000"><rect x="3" y="4" width="5" height="0.9"/><rect x="3" y="5.6" width="5" height="0.9"/><rect x="22" y="4" width="5" height="0.9"/><rect x="22" y="14.2" width="5" height="0.9"/></g>` },
    GR: { raw: `<rect width="30" height="20" fill="#ffffff"/><g fill="#0d5eaf"><rect y="0" width="30" height="2.22"/><rect y="4.44" width="30" height="2.22"/><rect y="8.88" width="30" height="2.22"/><rect y="13.32" width="30" height="2.22"/><rect y="17.76" width="30" height="2.24"/></g><rect width="11.1" height="11.1" fill="#0d5eaf"/><path d="M4.4 0h2.3v11.1H4.4z M0 4.4h11.1v2.3H0z" fill="#ffffff"/>` },
    TR: { raw: `<rect width="30" height="20" fill="#e30a17"/><circle cx="12" cy="10" r="5" fill="#ffffff"/><circle cx="13.6" cy="10" r="4" fill="#e30a17"/><path d="M18 10l-3.4 1.1 2.1-2.9v3.6l-2.1-2.9z" fill="#ffffff"/>` },
    IN: { raw: `<rect width="30" height="6.67" fill="#ff9933"/><rect y="6.67" width="30" height="6.67" fill="#ffffff"/><rect y="13.34" width="30" height="6.66" fill="#138808"/><circle cx="15" cy="10" r="2.6" fill="none" stroke="#000080" stroke-width="0.8"/>` },
    IL: { raw: `<rect width="30" height="20" fill="#ffffff"/><rect y="2.5" width="30" height="2.6" fill="#0038b8"/><rect y="14.9" width="30" height="2.6" fill="#0038b8"/><path d="M15 6.2l3.2 5.6h-6.4z M15 13.8l-3.2-5.6h6.4z" fill="none" stroke="#0038b8" stroke-width="0.9"/>` },
    SA: { raw: `<rect width="30" height="20" fill="#006c35"/><rect x="6" y="12.5" width="18" height="1.2" fill="#ffffff"/><rect x="6" y="7" width="14" height="1.2" fill="#ffffff"/><rect x="6" y="9.4" width="16" height="1.2" fill="#ffffff"/>` },
    TH: { raw: `<rect width="30" height="20" fill="#a51931"/><rect y="3.33" width="30" height="13.34" fill="#f4f5f8"/><rect y="6.67" width="30" height="6.66" fill="#2d2a4a"/>` },
    HR: { raw: `<rect width="30" height="6.67" fill="#ff0000"/><rect y="6.67" width="30" height="6.67" fill="#ffffff"/><rect y="13.34" width="30" height="6.66" fill="#171796"/><g fill="#ff0000"><rect x="12" y="6" width="2" height="2"/><rect x="16" y="6" width="2" height="2"/><rect x="14" y="8" width="2" height="2"/><rect x="12" y="10" width="2" height="2"/><rect x="16" y="10" width="2" height="2"/></g><rect x="12" y="6" width="6" height="6" fill="none" stroke="#ffffff" stroke-width="0.6"/>` },
    RS: { raw: `<rect width="30" height="6.67" fill="#c6363c"/><rect y="6.67" width="30" height="6.67" fill="#0c4076"/><rect y="13.34" width="30" height="6.66" fill="#ffffff"/><path d="M9 6h5v5c0 1.6-2.5 2.6-2.5 2.6S9 12.6 9 11z" fill="#c6363c" stroke="#edb92e" stroke-width="0.7"/>` },
    VN: { raw: `<rect width="30" height="20" fill="#da251d"/><path d="M15 5.5l1.6 4.9-4.2-3h5.2l-4.2 3z" fill="#ffff00"/>` },
    MY: { raw: `<rect width="30" height="20" fill="#ffffff"/><g fill="#cc0001"><rect y="0" width="30" height="1.43"/><rect y="2.86" width="30" height="1.43"/><rect y="5.72" width="30" height="1.43"/><rect y="8.58" width="30" height="1.43"/><rect y="11.44" width="30" height="1.43"/><rect y="14.3" width="30" height="1.43"/><rect y="17.16" width="30" height="1.43"/></g><rect width="15" height="11.44" fill="#010066"/><circle cx="6.5" cy="5.7" r="3" fill="#ffcc00"/><circle cx="8" cy="5.7" r="2.4" fill="#010066"/>` },
    LV: { raw: `<rect width="30" height="20" fill="#9e3039"/><rect y="8" width="30" height="4" fill="#ffffff"/>` },
    SI: { raw: `<rect width="30" height="6.67" fill="#ffffff"/><rect y="6.67" width="30" height="6.67" fill="#0000ff"/><rect y="13.34" width="30" height="6.66" fill="#ff0000"/>` },
  };
}

// Flat SVG for a language's country, or null when it is not in the set above.
_flagSvg(lang) {
  const cc = this._flagCountry(lang);
  if (!cc) return null;
  // Vendored artwork first; _flagSpecs covers only what was left out of it
  if (FLAG_SVGS[cc]) return FLAG_SVGS[cc];
  const spec = this._flagSpecs[cc];
  if (!spec) return null;
  let inner = spec.raw;
  if (!inner && spec.h) {
    const h = 20 / spec.h.length;
    inner = spec.h.map((c, i) => `<rect y="${(i * h).toFixed(2)}" width="30" height="${h.toFixed(2)}" fill="${c}"/>`).join('');
  }
  if (!inner && spec.v) {
    const w = 30 / spec.v.length;
    inner = spec.v.map((c, i) => `<rect x="${(i * w).toFixed(2)}" width="${w.toFixed(2)}" height="20" fill="${c}"/>`).join('');
  }
  if (!inner) return null;
  return `<svg class="fl-svg" viewBox="0 0 30 20" preserveAspectRatio="none" aria-hidden="true">${inner}</svg>`;
}

get _flStripIcons() {
  const _ico = d => `<svg class="fl-ico" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">${d}</svg>`;
  return {
    sub: _ico('<path d="M20 4H4a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2zM4 12h4v2H4v-2zm10 6H4v-2h10v2zm6 0h-4v-2h4v2zm0-4H10v-2h10v2z"/>'),
    audio: _ico('<path d="M14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77zM16.5 12c0-1.77-1-3.29-2.5-4.03v8.05c1.5-.73 2.5-2.25 2.5-4.02zM3 9v6h4l5 5V4L7 9H3z"/>'),
  };
}

_flagStrip(subCodes, audioCodes, ratingHtml, { endIcon = true } = {}) {
  const subs = this._topLangs((subCodes || []).filter(Boolean));
  const auds = this._topLangs((audioCodes || []).filter(Boolean));
  if (!ratingHtml && !subs.length && !auds.length) return '';

  // Geometry lives in .fl-strip's custom properties so the container query that
  // shrinks the rating badge on a narrow poster rescales the flags with it —
  // hard-coded pixels here made the flags overshoot the badge on phones.
  const flag = (code, side, z, tuck, ico, casts) => {
    const art = FLAT_SVG_FLAGS ? (this._flagSvg(code) || this._flagEmoji(code)) : this._flagEmoji(code);
    if (!art) return '';
    const right = side === 'right';
    // Sits over the outermost flag's uncovered part, so it never lands on the
    // seam where the next flag overlaps this one.
    const label = ico ? `<span class="fl-ico-ov fl-ico-${right ? 'r' : 'l'}">${ico}</span>` : '';
    // Only flags with a neighbour underneath cast — on the outer edge the
    // shadow would fall on the poster instead.
    const sh = casts ? ` fl-${right ? 'r' : 'l'}` : '';
    return `<span class="fl-flag${sh}${tuck ? ' fl-tuck' : ''}" title="${this._escHtml(code)}" style="z-index:${z}">${art}${label}</span>`;
  };

  // Left-hand flags stack forward towards the badge, right-hand ones away from
  // it; the badge sits above both. Everything is positioned so paint order
  // follows z-index rather than document order. The outermost flag of each
  // group carries the glyph naming what that side means.
  const left = subs.map((c, i) => flag(c, 'left', i + 1, i > 0, '', i > 0)).join('');
  const right = auds.map((c, i) => flag(c, 'right', 90 - i, true, '', i < auds.length - 1)).join('');
  // One label, not two: marking the audio side is enough for the subtitle side
  // to be read as the other one.
  const endIco = (endIcon && auds.length) ? `<span class="fl-ico-end">${this._flStripIcons.audio}</span>` : '';

  return `<div class="fl-strip">
    ${left}
    ${ratingHtml ? `<span class="fl-badge${subs.length ? ' fl-tuck fl-sh-l' : ''}${auds.length ? ' fl-sh-r' : ''}">${ratingHtml}</span>` : ''}
    ${right}
    ${endIco}
  </div>`;
}

// Map full language name → ISO 639-1 code
_langCode(name) {
  const raw = String(name ?? '').trim();
  if (!raw) return '';
  const MAP = {
    czech:'CS', english:'EN', german:'DE', french:'FR', spanish:'ES',
    italian:'IT', polish:'PL', slovak:'SK', russian:'RU', japanese:'JA',
    korean:'KO', chinese:'ZH', portuguese:'PT', dutch:'NL', swedish:'SV',
    norwegian:'NO', danish:'DA', finnish:'FI', hungarian:'HU', romanian:'RO',
    ukrainian:'UK', turkish:'TR', arabic:'AR', hindi:'HI', croatian:'HR',
    serbian:'SR', bulgarian:'BG', greek:'EL', hebrew:'HE', thai:'TH',
    vietnamese:'VI', indonesian:'ID', persian:'FA', farsi:'FA', malay:'MS',
    estonian:'ET', latvian:'LV', lithuanian:'LT', slovenian:'SL',
    catalan:'CA', icelandic:'IS', flemish:'NL',
  };
  // Sources disagree on how a language is spelled: Sonarr sends "English",
  // mediaInfo sometimes "eng", Bazarr a two-letter code. Truncating whatever
  // did not match produced nonsense like "bul" -> "BU", which then resolved to
  // no country at all.
  const ISO3 = {
    ces:'CS', cze:'CS', eng:'EN', deu:'DE', ger:'DE', fra:'FR', fre:'FR',
    spa:'ES', ita:'IT', pol:'PL', slk:'SK', slo:'SK', rus:'RU', jpn:'JA',
    kor:'KO', zho:'ZH', chi:'ZH', por:'PT', nld:'NL', dut:'NL', swe:'SV',
    nor:'NO', nob:'NO', dan:'DA', fin:'FI', hun:'HU', ron:'RO', rum:'RO',
    ukr:'UK', tur:'TR', ara:'AR', hin:'HI', hrv:'HR', srp:'SR', bul:'BG',
    ell:'EL', gre:'EL', heb:'HE', tha:'TH', vie:'VI', ind:'ID', fas:'FA',
    per:'FA', msa:'MS', may:'MS', est:'ET', lav:'LV', lit:'LT', slv:'SL',
    cat:'CA', isl:'IS', ice:'IS',
  };
  const l = raw.toLowerCase();
  if (MAP[l]) return MAP[l];
  if (ISO3[l]) return ISO3[l];
  if (l.length === 2) return raw.toUpperCase();
  // Unknown/Original and friends carry no language at all
  if (l === 'unknown' || l === 'original' || l === 'any') return '';
  return raw.substring(0, 2).toUpperCase();
}

// Max 2 languages, CS first then EN then others
_topLangs(langs) {
  const unique = [...new Set(langs.filter(Boolean))];
  if (unique.length <= 2) return unique;
  const priority = ['CS', 'EN'];
  const ordered = [
    ...priority.filter(l => unique.includes(l)),
    ...unique.filter(l => !priority.includes(l)),
  ];
  return ordered.slice(0, 2);
}

_qualityBadge2(m) {
  if (!this._radarr2Configured) return '';
  const m2 = m.tmdbId ? this._radarr2ByTmdb.get(String(m.tmdbId)) : null;
  if (!m2) return '';
  const inR2 = m2.hasFile;
  const inR1 = m.hasFile;
  const style = 'font-size:8px;padding:1px 4px;border-radius:3px;color:#fff;font-weight:700;letter-spacing:.3px';
  if (inR1 && inR2) return `<span class="badge b-r2" style="background:linear-gradient(90deg,rgba(0,120,255,0.85),rgba(140,40,220,0.85));${style}">R+R2</span>`;
  if (inR2)         return `<span class="badge b-r2" style="background:rgba(140,40,220,0.85);${style}">R2</span>`;
  return '';
}

}

export const posterFlagsMixin = _PosterFlagsMethods.prototype;
