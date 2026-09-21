// Jellystat's modal: everything behind its tiles, fetched the first time the modal
// opens (see shared/lazy.js and card.js). The tiles themselves are core.
// The statistics kit comes along — the tables' paging and column menus, the
// graphs — which Tautulli, Tracearr and Jellystat share. esbuild gives it a
// chunk of its own, fetched by whichever of the three opens first.
import { wireTautulliGraphsMixin } from '../wire/tautulli-graphs.js';
import { tautulliSharedMixin } from '../render/tautulli-shared.js';
import { tautulliGraphsMixin } from '../render/tautulli-graphs.js';
import { wireJellystatMixin } from '../wire/jellystat.js';
import { jellystatSharedMixin } from '../render/jellystat-shared.js';
import { jellystatTableMixin } from '../render/jellystat-table.js';
import { jellystatMixin } from '../render/jellystat.js';
import { jellystatGraphsMixin } from '../render/jellystat-graphs.js';

export default [
  wireTautulliGraphsMixin,
  tautulliSharedMixin,
  tautulliGraphsMixin,
  wireJellystatMixin,
  jellystatSharedMixin,
  jellystatTableMixin,
  jellystatMixin,
  jellystatGraphsMixin,
];
