import type { AdjustmentPreset } from '../adjustments/merge';
import type { EffectId } from '../effects/catalog';

/** Category names shown as tabs in the Filters panel. Order here is the order in the UI. */
export type FilterCategory =
  | 'Film'
  | 'Vintage'
  | 'Black & White'
  | 'Japanese'
  | 'Korean'
  | 'Cinematic'
  | 'Sunset'
  | 'Pearl'
  | 'Portrait'
  | 'Food'
  | 'Landscape'
  | 'Street'
  | 'Neon'
  | 'Pastel'
  | 'Mood'
  | 'Cross Process'
  | 'Duotone'
  | 'Seasons'
  | 'Travel'
  | 'Retro Digital'
  | 'Minimal';

/** Recipe for a generated 3D LUT that a preset can carry in addition to slider values. */
export type LutRecipe =
  | { kind: 'duotone'; shadow: string; highlight: string }
  | { kind: 'gradientMap'; stops: [string, string, string] }
  | { kind: 'crossProcess'; strength: number };

/**
 * A creative effect a filter brings along (for example a very light bloom). `amount` is the full
 * strength at filter intensity 100 and is scaled down with the intensity slider. It only applies
 * while the user has no effect of their own selected.
 */
export interface FilterEffect {
  id: EffectId;
  amount: number;
  param: number;
}

/** One filter (a named look). Applying it means blending `preset` onto the current adjustments. */
export interface FilterDefinition {
  id: string;
  name: string;
  category: FilterCategory;
  preset: AdjustmentPreset;
  lut?: LutRecipe;
  effect?: FilterEffect;
}
