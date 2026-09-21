// Activity's modal: everything behind what the rows draw, fetched the first time it
// opens (see shared/lazy.js and card.js). The cards and tiles themselves are core.
import { activityRenderMixin } from '../render/activity.js';
import { activityQueueRenderMixin } from '../render/activity-queue.js';
import { activityHistoryRenderMixin } from '../render/activity-history.js';
import { activityMissingRenderMixin } from '../render/activity-missing.js';
import { wireActivityMixin } from '../wire/activity.js';
import { wireActivityTabsMixin } from '../wire/activity-tabs.js';
import { wireActivityActionsMixin } from '../wire/activity-actions.js';
import { wireActivityColumnsMixin } from '../wire/activity-columns.js';

export default [
  activityRenderMixin,
  activityQueueRenderMixin,
  activityHistoryRenderMixin,
  activityMissingRenderMixin,
  wireActivityMixin,
  wireActivityTabsMixin,
  wireActivityActionsMixin,
  wireActivityColumnsMixin,
];
