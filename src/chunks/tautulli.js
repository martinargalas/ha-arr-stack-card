// Tautulli's modal: everything behind its tiles, fetched the first time the modal
// opens (see shared/lazy.js and card.js). The tiles themselves are core.
// The statistics kit comes along — the tables' paging and column menus, the
// graphs — which Tautulli, Tracearr and Jellystat share. esbuild gives it a
// chunk of its own, fetched by whichever of the three opens first.
import { wireTautulliMixin } from '../wire/tautulli.js';
import { wireTautulliTablesMixin } from '../wire/tautulli-tables.js';
import { wireTautulliDetailsMixin } from '../wire/tautulli-details.js';
import { wireTautulliGraphsMixin } from '../wire/tautulli-graphs.js';
import { tautulliSharedMixin } from '../render/tautulli-shared.js';
import { tautulliTableMixin } from '../render/tautulli-table.js';
import { tautulliUserRenderMixin } from '../render/tautulli-user.js';
import { tautulliLibraryRenderMixin } from '../render/tautulli-library.js';
import { tautulliMixin } from '../render/tautulli.js';
import { tautulliGraphsMixin } from '../render/tautulli-graphs.js';

export default [
  wireTautulliMixin,
  wireTautulliTablesMixin,
  wireTautulliDetailsMixin,
  wireTautulliGraphsMixin,
  tautulliSharedMixin,
  tautulliTableMixin,
  tautulliUserRenderMixin,
  tautulliLibraryRenderMixin,
  tautulliMixin,
  tautulliGraphsMixin,
];
