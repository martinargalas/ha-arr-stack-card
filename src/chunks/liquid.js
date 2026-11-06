// Liquid glass: the WebGL refraction behind the Liquid Glass and Apple Home
// presets, fetched only when one of them is on (see render/liquid.js).
import { liquidMixin } from '../render/liquid.js';
import { warmBackdrop } from '../render/liquid-gl.js';

// Fetched ahead of the first paint (card.js setConfig): get the wallpaper going
warmBackdrop();

export default [liquidMixin];
