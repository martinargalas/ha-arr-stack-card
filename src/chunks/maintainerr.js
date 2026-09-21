// Maintainerr's modal: everything behind its tiles, fetched the first time the modal
// opens (see shared/lazy.js and card.js). The tiles themselves are core.
import { maintainerrRenderMixin } from '../render/maintainerr.js';
import { wireMaintainerrMixin } from '../wire/maintainerr.js';
import { maintainerrOverviewRenderMixin } from '../render/maintainerr-overview.js';
import { maintainerrRulesRenderMixin } from '../render/maintainerr-rules.js';
import { maintainerrCollectionsRenderMixin } from '../render/maintainerr-collections.js';
import { maintainerrCalendarRenderMixin } from '../render/maintainerr-calendar.js';
import { wireMaintainerrOverviewMixin } from '../wire/maintainerr-overview.js';
import { wireMaintainerrRulesMixin } from '../wire/maintainerr-rules.js';
import { wireMaintainerrCollectionsMixin } from '../wire/maintainerr-collections.js';

export default [
  maintainerrRenderMixin,
  wireMaintainerrMixin,
  maintainerrOverviewRenderMixin,
  maintainerrRulesRenderMixin,
  maintainerrCollectionsRenderMixin,
  maintainerrCalendarRenderMixin,
  wireMaintainerrOverviewMixin,
  wireMaintainerrRulesMixin,
  wireMaintainerrCollectionsMixin,
];
