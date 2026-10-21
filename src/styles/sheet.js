import { STYLES } from './index.js';

// STYLES runs to some 235 KB. A <style> per card made every card on a
// dashboard parse all of it again; one constructed sheet is parsed once and
// adopted by each card's shadow root — the main card's and a search header's
// alike. Browsers without constructable sheets get null and keep a <style>.
let ARR_SHEET;
export function arrSharedSheet() {
  if (ARR_SHEET !== undefined) return ARR_SHEET;
  try {
    const sheet = new CSSStyleSheet();
    sheet.replaceSync(STYLES);
    ARR_SHEET = sheet;
  } catch (_) {
    ARR_SHEET = null;
  }
  return ARR_SHEET;
}
