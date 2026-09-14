// The age rating shown next to the genres: which country's board wins, and how
// each board's label turns into a plain "from this age" number.
import test from 'node:test';
import assert from 'node:assert';
import { makeCard } from './harness.js';

const chip = (card, detail) => card._certChipHtml(detail);

// A film rated in both countries, so which one wins shows whose board is asked.
const czAndUs = { releases: { results: [
  { iso_3166_1: 'US', release_dates: [{ certification: 'R' }] },
  { iso_3166_1: 'CZ', release_dates: [{ certification: '' }, { certification: '15+' }] },
] } };
const inCountry = (card, country) => { card._hass = { ...card._hass, config: { country } }; return card; };

test('the country set in Home Assistant is asked first', () => {
  const html = chip(inCountry(makeCard(), 'CZ'), czAndUs);
  assert.match(html, />15\+</);
  assert.match(html, /title="15\+ \(CZ\)"/);
});

test('a US install reads the US rating even when a Czech one exists', () => {
  const html = chip(inCountry(makeCard(), 'US'), czAndUs);
  assert.match(html, />17\+</);
  assert.match(html, /\(US\)/);
});

test('with no country set, or none rated there, the US and UK boards stand in', () => {
  assert.match(chip(makeCard(), czAndUs), /\(US\)/);
  const gbOnly = { releases: { results: [
    { iso_3166_1: 'CZ', release_dates: [{ certification: '12+' }] },
    { iso_3166_1: 'GB', release_dates: [{ certification: '15' }] },
  ] } };
  assert.match(chip(inCountry(makeCard(), 'SE'), gbOnly), /\(GB\)/);
});

test('lettered boards are read as an age', () => {
  const card = makeCard();
  const movie = c => ({ releases: { results: [{ iso_3166_1: 'US', release_dates: [{ certification: c }] }] } });
  assert.match(chip(card, movie('PG-13')), />13\+</);
  assert.match(chip(card, movie('R')),     />17\+</);
  assert.match(chip(card, movie('G')),     />0\+</);
  const series = r => ({ contentRatings: { results: [{ iso_3166_1: 'US', rating: r }] } });
  assert.match(chip(card, series('TV-MA')), />17\+</);
  assert.match(chip(card, series('TV-Y7')), />7\+</);
  assert.match(chip(card, series('TV-14')), />14\+</);
});

test('a number inside the label is enough', () => {
  const card = makeCard();
  assert.match(chip(card, { certifications: [{ country: 'AU', rating: 'R 18+' }] }), />18\+</);
  assert.match(chip(card, { certifications: [{ country: 'GB', rating: '12A' }] }),   />12\+</);
});

test('the *arr instance fills in when no board answered', () => {
  const card = makeCard();
  assert.match(chip(card, { _sonarrSeries: { certification: 'TV-14' } }), />14\+</);
  assert.match(chip(card, { certification: 'PG' }), />7\+</);
});

test('an unreadable label is shown as it stands, and nothing means nothing', () => {
  const card = makeCard();
  assert.match(chip(card, { certification: 'NR' }), />NR</);
  assert.strictEqual(chip(card, {}), '');
  assert.strictEqual(chip(card, null), '');
});

test('a country we never asked for is still better than a blank', () => {
  const card = makeCard();
  const html = chip(card, { contentRatings: { results: [{ iso_3166_1: 'BR', rating: '16' }] } });
  assert.match(html, />16\+</);
  assert.match(html, /\(BR\)/);
});
