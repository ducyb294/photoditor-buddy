import { describe, expect, it } from 'vitest';
import { ADJUSTMENT_BY_KEY, HSL_BANDS, defaultAdjustments } from '../adjustments/defaults';
import { applyPreset, stackPreset } from '../adjustments/merge';
import { FILTER_CATALOG, FILTER_CATEGORIES, filtersInCategory, findFilter } from './catalog';
import { buildRecipeLut } from './lutRecipes';

describe('filter catalogue', () => {
  it('ships at least 200 filters with unique ids', () => {
    expect(FILTER_CATALOG.length).toBeGreaterThanOrEqual(200);
    const ids = new Set(FILTER_CATALOG.map((f) => f.id));
    expect(ids.size).toBe(FILTER_CATALOG.length);
  });

  it('every preset value is inside its slider range', () => {
    for (const filter of FILTER_CATALOG) {
      for (const [key, value] of Object.entries(filter.preset)) {
        if (typeof value !== 'number') continue;
        const def = ADJUSTMENT_BY_KEY[key as keyof typeof ADJUSTMENT_BY_KEY];
        expect(def, `${filter.id} uses unknown slider ${key}`).toBeDefined();
        expect(value, `${filter.id}.${key}`).toBeGreaterThanOrEqual(def.min);
        expect(value, `${filter.id}.${key}`).toBeLessThanOrEqual(def.max);
      }
      if (filter.preset.hsl) {
        for (const band of Object.keys(filter.preset.hsl)) expect(HSL_BANDS).toContain(band);
      }
    }
  });

  it('categories are derived from the catalogue and lookups work', () => {
    expect(FILTER_CATEGORIES.length).toBeGreaterThanOrEqual(15);
    for (const category of FILTER_CATEGORIES)
      expect(filtersInCategory(category).length).toBeGreaterThan(0);
    expect(findFilter('film-portra-400')?.name).toBe('Portra 400');
    expect(findFilter('does-not-exist')).toBeUndefined();
  });

  describe('Pastel Soft', () => {
    const filter = findFilter('pastel-pastel-soft');

    it('is listed first in the Pastel category under its display name', () => {
      expect(filter?.name).toBe('Pastel Soft');
      expect(filtersInCategory('Pastel')[0]?.id).toBe('pastel-pastel-soft');
    });

    it('intensity 0 returns the user adjustments untouched, for both blend modes', () => {
      const base = defaultAdjustments();
      base.exposure = 12;
      base.curves.red = [
        { x: 0, y: 0 },
        { x: 0.5, y: 0.6 },
        { x: 1, y: 1 },
      ];
      expect(stackPreset(base, filter!.preset, 0)).toEqual(base);
      expect(applyPreset(base, filter!.preset, 0)).toEqual(base);
    });

    it('at full intensity lifts blacks, softens contrast and saturation, and keeps ordering', () => {
      const out = stackPreset(defaultAdjustments(), filter!.preset, 1);
      expect(out.contrast).toBeLessThan(0);
      expect(out.saturation).toBeLessThan(0);
      expect(out.shadows).toBeGreaterThan(0);
      expect(out.highlights).toBeLessThan(0);
      expect(out.blacks).toBeGreaterThan(0);
      const [first, , , , last] = out.curves.rgb;
      expect(first!.y).toBeGreaterThan(0); // black point lifted
      expect(last!.y).toBeLessThan(1); // whites softened, never clipped
      for (let i = 1; i < out.curves.rgb.length; i++)
        expect(out.curves.rgb[i]!.y).toBeGreaterThan(out.curves.rgb[i - 1]!.y);
    });

    it('is not a flat colour cast: no single channel-offset slider dominates', () => {
      const p = filter!.preset;
      expect(Math.abs(p.temperature ?? 0)).toBeLessThanOrEqual(15);
      expect(Math.abs(p.tint ?? 0)).toBeLessThanOrEqual(10);
      expect(p.exposure).toBeDefined();
      expect(p.curves?.rgb).toBeDefined();
      expect(p.colorBalance?.midtones).toBeDefined();
    });
  });

  it('builds LUTs for every recipe and caches them', () => {
    for (const filter of FILTER_CATALOG) {
      if (!filter.lut) continue;
      const lut = buildRecipeLut(filter.lut, 9);
      expect(lut.data.length).toBe(9 * 9 * 9 * 3);
      expect(buildRecipeLut(filter.lut, 9)).toBe(lut);
    }
  });
});
