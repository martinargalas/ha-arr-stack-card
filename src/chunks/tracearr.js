// Tracearr's modal: everything behind its tiles, fetched the first time the modal
// opens (see shared/lazy.js and card.js). The tiles themselves are core.
// The statistics kit comes along — the tables' paging and column menus, the
// graphs — which Tautulli, Tracearr and Jellystat share. esbuild gives it a
// chunk of its own, fetched by whichever of the three opens first.
import { wireTautulliGraphsMixin } from '../wire/tautulli-graphs.js';
import { tautulliSharedMixin } from '../render/tautulli-shared.js';
import { tautulliGraphsMixin } from '../render/tautulli-graphs.js';
import { wireTracearrMixin } from '../wire/tracearr.js';
import { wireTracearrTabsMixin } from '../wire/tracearr-tabs.js';
import { wireTracearrRulesMixin } from '../wire/tracearr-rules.js';
import { tracearrTableMixin } from '../render/tracearr-table.js';
import { tracearrRulesMixin } from '../render/tracearr-rules.js';
import { tracearrHistoryMixin } from '../render/tracearr-history.js';
import { tracearrLibraryMixin } from '../render/tracearr-library.js';
import { tracearrWatchMixin } from '../render/tracearr-watch.js';
import { tracearrNetworkMixin } from '../render/tracearr-network.js';
import { tracearrMixin } from '../render/tracearr.js';
import { tracearrLoadMixin } from '../render/tracearr-load.js';

export default [
  wireTautulliGraphsMixin,
  tautulliSharedMixin,
  tautulliGraphsMixin,
  wireTracearrMixin,
  wireTracearrTabsMixin,
  wireTracearrRulesMixin,
  tracearrTableMixin,
  tracearrRulesMixin,
  tracearrHistoryMixin,
  tracearrLibraryMixin,
  tracearrWatchMixin,
  tracearrNetworkMixin,
  tracearrMixin,
  tracearrLoadMixin,
];
