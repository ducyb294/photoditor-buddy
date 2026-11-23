import { describe, expect, it } from 'vitest';
import { ADJUSTMENT_BY_KEY, HSL_BANDS, defaultAdjustments } from '../adjustments/defaults';
import { applyPreset, stackPreset } from '../adjustments/merge';
import {
  FILTER_CATALOG,
  FILTER_CATEGORIES,
  filterEffect,
  filtersInCategory,
  findFilter,
} from './catalog';
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

    it('is listed in the Pastel category under its display name, after the Dreamy filters', () => {
      expect(filter?.name).toBe('Pastel Soft');
      expect(filtersInCategory('Pastel')[2]?.id).toBe('pastel-pastel-soft');
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

  describe('Dreamy Pastel', () => {
    const filter = findFilter('pastel-dreamy-pastel');

    it('is the first filter of the Pastel category', () => {
      expect(filter?.name).toBe('Dreamy Pastel');
      expect(filtersInCategory('Pastel')[0]?.id).toBe('pastel-dreamy-pastel');
    });

    it('intensity 0 changes nothing: no adjustments and no effect', () => {
      const base = defaultAdjustments();
      base.saturation = 7;
      expect(stackPreset(base, filter!.preset, 0)).toEqual(base);
      expect(filterEffect(filter!, 0)).toBeNull();
    });

    it('grades the three tonal ranges separately and keeps highlights from clipping', () => {
      const out = stackPreset(defaultAdjustments(), filter!.preset, 1);
      const yAt = (x: number): number => out.curves.rgb.find((p) => p.x === x)!.y;
      expect(yAt(0)).toBeGreaterThan(0.02); // lifted blacks
      expect(yAt(0.5)).toBeGreaterThan(0.5); // brighter mid-tones
      expect(yAt(0.875)).toBeLessThan(0.95); // upper end held back, so bright photos stay bright
      expect(yAt(1)).toBeLessThan(1); // highlight roll-off, never clipped
      for (let i = 1; i < out.curves.rgb.length; i++)
        expect(out.curves.rgb[i]!.y).toBeGreaterThan(out.curves.rgb[i - 1]!.y);
      // The lift is a smooth lift, not a kink: no step steeper than 2.5x the diagonal.
      for (let i = 1; i < out.curves.rgb.length; i++) {
        const dy = out.curves.rgb[i]!.y - out.curves.rgb[i - 1]!.y;
        const dx = out.curves.rgb[i]!.x - out.curves.rgb[i - 1]!.x;
        expect(dy / dx).toBeLessThan(2.5);
      }
      expect(out.highlights).toBeLessThan(0);
      const { shadows, midtones } = out.colorBalance;
      expect(midtones[0]).toBeGreaterThan(midtones[1]); // pink-magenta mid-tones (red over green)
      expect(shadows[2]).toBeGreaterThan(shadows[0]); // lavender shadows (blue over red)
      expect(out.saturation).toBeGreaterThan(-15); // muted, not drained
      expect(out.exposure).toBeLessThanOrEqual(12); // no strong exposure push
    });

    it('carries a very light bloom that scales with intensity and never pierces a user effect', () => {
      expect(filter!.effect?.id).toBe('bloom');
      const full = filterEffect(filter!, 1)!;
      expect(full.amount).toBeLessThanOrEqual(20);
      expect(filterEffect(filter!, 0.5)!.amount).toBeCloseTo(full.amount / 2, 5);
      expect(filterEffect(findFilter('pastel-pastel-soft')!, 1)).toBeNull();
    });
  });

  it('Dreamy Pastel V1 keeps the document values and sits right after Dreamy Pastel', () => {
    const v1 = findFilter('pastel-dreamy-pastel-v1')!;
    expect(filtersInCategory('Pastel')[1]?.id).toBe('pastel-dreamy-pastel-v1');
    expect(v1.preset.exposure).toBe(12.5);
    expect(v1.preset.shadows).toBe(26);
    expect(v1.preset.curves?.blue?.[0]).toEqual({ x: 0, y: 0.11 });
    expect(Object.keys(v1.preset.hsl ?? {})).toHaveLength(8);
    expect(stackPreset(defaultAdjustments(), v1.preset, 0)).toEqual(defaultAdjustments());
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
