// the Library modal: everything behind what the rows draw, fetched the first time it
// opens (see shared/lazy.js and card.js). The cards and tiles themselves are core.
import { libraryMixin } from '../render/library.js';
import { libraryDataMixin } from '../render/library-data.js';
import { libraryTableMixin } from '../render/library-table.js';
import { libraryCardsMixin } from '../render/library-cards.js';
import { libraryWireMixin } from '../wire/library.js';
import { libraryClickMixin } from '../wire/library-click.js';
import { libraryLayoutMixin } from '../wire/library-layout.js';

export default [
  libraryMixin,
  libraryDataMixin,
  libraryTableMixin,
  libraryCardsMixin,
  libraryWireMixin,
  libraryClickMixin,
  libraryLayoutMixin,
];
