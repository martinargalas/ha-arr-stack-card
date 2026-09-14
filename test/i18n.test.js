// The card's languages: Czech and English complete, French as far as its
// translation goes, and English wherever a language has no word yet.
import test from 'node:test';
import assert from 'node:assert/strict';
import { makeCard } from './harness.js';
import { ARR_I18N } from '../src/i18n.js';

const inLang = localisation => makeCard({ _config: { localisation } });

test('every language holds exactly the keys English holds', () => {
  const en = Object.keys(ARR_I18N.en).sort();
  assert.deepEqual(Object.keys(ARR_I18N.cs).sort(), en);
  assert.deepEqual(Object.keys(ARR_I18N.fr).sort(), en);
});

test('French strings come from the French table', () => {
  const card = inLang('fr');
  assert.equal(card._t('downloads'), ARR_I18N.fr.downloads);
  assert.notEqual(card._t('downloads'), ARR_I18N.en.downloads);
  assert.equal(card._t('castBtn'), 'Distribution');
});

test('a key a language has no word for reads in English, not as its name', t => {
  ARR_I18N.en.__onlyEnglish = 'only in English';
  t.after(() => { delete ARR_I18N.en.__onlyEnglish; });
  assert.equal(inLang('fr')._t('__onlyEnglish'), 'only in English');
  assert.equal(inLang('cs')._t('__onlyEnglish'), 'only in English');
  assert.equal(inLang('fr')._t('__nowhere'), '__nowhere');
});

test('an unknown language is English', () => {
  assert.equal(inLang('de')._t('downloads'), ARR_I18N.en.downloads);
  assert.equal(inLang('de')._lg(), 'en');
});

test('seasons count in each language', () => {
  assert.equal(inLang('fr')._tSeasons(1), '1 saison');
  assert.equal(inLang('fr')._tSeasons(3), '3 saisons');
  assert.equal(inLang('en')._tSeasons(1), '1 season');
  assert.equal(inLang('cs')._tSeasons(5), '5 sérií');
});

test('dates follow the card language', () => {
  assert.match(inLang('fr')._uiDateFmt().resolvedOptions().locale, /^fr/);
  assert.match(inLang('cs')._uiDateFmt().resolvedOptions().locale, /^cs/);
  assert.match(inLang('en')._uiDateFmt().resolvedOptions().locale, /^en/);
});

test("Maintainerr's deletion badge: French words, and the other languages as they were", () => {
  assert.equal(inLang('fr')._mtGoneText(1, 0, false), 'SUPPRIMÉ DEMAIN');
  assert.equal(inLang('fr')._mtGoneText(3, 0, true), '3J');
  assert.equal(inLang('en')._mtGoneText(3, 0, true), '3D');
  assert.equal(inLang('cs')._mtGoneText(1, 0, false), 'MIZÍ ZÍTRA');
});

test('a message with an instance in it names the instance in every language', () => {
  for (const l of ['cs', 'en', 'fr']) {
    const msg = inLang(l)._t('isAddFirstMovie').replace('{inst}', () => 'Radarr 4K');
    assert.ok(msg.includes('Radarr 4K') && !msg.includes('{inst}'), `${l}: ${msg}`);
  }
});
