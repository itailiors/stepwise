// Asset bindings: icons are inlined from assets/icons/*.svg (currentColor strokes),
// medals/bezels are served as hashed files straight from assets/medals/.
import type { MedalId } from '../types/stepwise';

const rawIcons = import.meta.glob('../../assets/icons/*.svg', { query: '?raw', import: 'default', eager: true }) as Record<
  string,
  string
>;

export type IconName =
  | 'checkpoint-diamond'
  | 'chromatic-clock'
  | 'compare-optimal'
  | 'half-step-lock'
  | 'help'
  | 'lava-hazard'
  | 'linear-rail'
  | 'pause'
  | 'play'
  | 'share'
  | 'sound-muted'
  | 'sound-on'
  | 'stats'
  | 'theme-moon'
  | 'theme-sun'
  | 'undo';

export const ICONS: Record<string, string> = Object.fromEntries(
  Object.entries(rawIcons).map(([path, svg]) => [path.split('/').pop()!.replace('.svg', ''), svg]),
);

const medalFiles = import.meta.glob('../../assets/medals/*.{png,svg}', { query: '?url', import: 'default', eager: true }) as Record<
  string,
  string
>;
const MEDAL_URLS: Record<string, string> = Object.fromEntries(
  Object.entries(medalFiles).map(([path, url]) => [path.split('/').pop()!.replace(/\.(png|svg)$/, ''), url]),
);

export const medalUrl = (id: MedalId): string => MEDAL_URLS[id];

export type FrameId = 'frame-eagle' | 'frame-par' | 'frame-solved' | 'frame-challenge' | 'medal-frame';
export const frameUrl = (id: FrameId): string => MEDAL_URLS[id];

export { default as brandMarkUrl } from '../../assets/brand/favicon.svg?url';

export const MEDAL_NAMES: Record<MedalId, string> = {
  'medal-eagle': 'Eagle',
  'medal-par-pure': 'Par Pure',
  'medal-par': 'Par',
  'medal-solved': 'Solved',
  'medal-half-step-master': 'Half-Step Master',
  'medal-four-voice-virtuoso': 'Four-Voice Virtuoso',
};
