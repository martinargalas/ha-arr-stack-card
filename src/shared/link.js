// Which main card a search header (arr-stack-search) belongs to. Both live in
// one bundle, so a module-level registry is shared by every card on the page.
// A header pairs with a card that has search_in_header and the same `link`
// (both unset counts as the same); with several, the first one wins.
export const ARR_LINK = { cards: new Set(), bars: new Set() };

export const linkOf = cfg => String(cfg?.link ?? cfg?.search_link ?? '');

export function cardForBar(bar) {
  const key = linkOf(bar._config);
  for (const c of ARR_LINK.cards) {
    if (c.isConnected && c._config?.search_in_header && linkOf(c._config) === key) return c;
  }
  return null;
}

export function barForCard(card) {
  if (!card._config?.search_in_header) return null;
  for (const b of ARR_LINK.bars) {
    if (b.isConnected && b._card === card) return b;
  }
  return null;
}
