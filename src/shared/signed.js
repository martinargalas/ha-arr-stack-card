// Paths Home Assistant signs (auth/sign_path) carry `authSig`, a token bound to
// the login that asked for it and to an end date. One kept on this device from
// another login (signed out, the browser's session reset) or past its end gets
// a 401 for every picture. These tell which login a kept one is from, and drop
// the ones that can no longer load.

function hash(s) {
  let h = 5381;
  for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) | 0;
  return (h >>> 0).toString(36);
}

// The login this page runs under, as a short tag (never the token itself)
export function authTag(hass) {
  const rt = hass?.auth?.data?.refresh_token || hass?.connection?.options?.auth?.data?.refresh_token || '';
  return rt ? hash(rt) : '';
}

// When the signature in `url` ends, in ms; 0 when it cannot be read
function sigEnd(url) {
  const m = /[?&]authSig=([^&"'\s]+)/.exec(url);
  if (!m) return null;
  try {
    const part = m[1].split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
    const exp = JSON.parse(atob(part + '==='.slice((part.length + 3) % 4))).exp;
    return Number(exp) * 1000 || 0;
  } catch { return 0; }
}

// A signed address that will not load: from another login, or ended (with a
// minute to spare). An address without a signature is never dead here.
export function sigDead(url, sameLogin, now = Date.now()) {
  const end = sigEnd(String(url || ''));
  if (end === null) return false;
  return !sameLogin || end - 60_000 < now;
}

// Markup with every picture whose signature is dead left without its src
export function dropDeadSigs(html, sameLogin, now = Date.now()) {
  if (!html || !html.includes('authSig=')) return html;
  return html.replace(/\ssrc="([^"]*authSig=[^"]*)"/g, (all, url) =>
    sigDead(url.replace(/&amp;/g, '&'), sameLogin, now) ? '' : all);
}
