// Countries of origin a filter offers: where films, series and music most
// often come from. Named by the browser in the card's language, so no list
// of names has to be kept.
export const ORIGIN_COUNTRIES = [
  'US', 'GB', 'CA', 'AU', 'NZ', 'IE', 'FR', 'DE', 'AT', 'CH', 'IT', 'ES', 'PT', 'NL', 'BE',
  'CZ', 'SK', 'PL', 'HU', 'RO', 'SE', 'DK', 'NO', 'FI', 'IS', 'RU', 'UA', 'GR', 'TR', 'IL',
  'IR', 'IN', 'JP', 'KR', 'CN', 'HK', 'TW', 'TH', 'MX', 'BR', 'AR', 'ZA',
];

/** A region's name in the given language, the code itself where Intl has none. */
export function regionName(code, lang) {
  try { return new Intl.DisplayNames([lang], { type: 'region' }).of(code) || code; } catch (_) { return code; }
}
