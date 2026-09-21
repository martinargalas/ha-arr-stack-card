// the artist and album windows: everything behind what the rows draw, fetched the first time it
// opens (see shared/lazy.js and card.js). The cards and tiles themselves are core.
import { musicRenderMixin } from '../render/music.js';
import { wireMusicMixin } from '../wire/music.js';
import { wireMusicAddMixin } from '../wire/music-add.js';
import { wireMusicAlbumsMixin } from '../wire/music-albums.js';
import { wireMusicLayoutMixin } from '../wire/music-layout.js';
import { wireMusicActionsMixin } from '../wire/music-actions.js';

export default [
  musicRenderMixin,
  wireMusicMixin,
  wireMusicAddMixin,
  wireMusicAlbumsMixin,
  wireMusicLayoutMixin,
  wireMusicActionsMixin,
];
