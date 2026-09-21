// Prowlarr's modal: everything behind its tiles, fetched the first time the modal
// opens (see shared/lazy.js and card.js). The tiles themselves are core.
import { prowlarrRenderMixin } from '../render/prowlarr.js';
import { wireProwlarrMixin } from '../wire/prowlarr.js';
import { wireProwlarrIndexersMixin } from '../wire/prowlarr-indexers.js';
import { wireProwlarrIndexerFormMixin } from '../wire/prowlarr-indexer-form.js';
import { wireProwlarrAppsMixin } from '../wire/prowlarr-apps.js';
import { wireProwlarrStatsMixin } from '../wire/prowlarr-stats.js';
import { wireProwlarrHistoryMixin } from '../wire/prowlarr-history.js';

export default [
  prowlarrRenderMixin,
  wireProwlarrMixin,
  wireProwlarrIndexersMixin,
  wireProwlarrIndexerFormMixin,
  wireProwlarrAppsMixin,
  wireProwlarrStatsMixin,
  wireProwlarrHistoryMixin,
];
