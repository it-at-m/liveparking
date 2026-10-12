import type { Feature, MultiPolygon, Polygon } from "geojson";

import { describe, expect, test } from "vitest";

import {
  createCityMask,
  createMapStyle,
  MAP_ATTRIBUTION,
  MAP_FONT_FACES,
} from "../../src/util/mapStyle";

const outerRing = [
  [11.4, 48.1],
  [11.6, 48.1],
  [11.6, 48.2],
  [11.4, 48.2],
  [11.4, 48.1],
];
const enclaveRing = [
  [11.7, 48.0],
  [11.71, 48.0],
  [11.71, 48.01],
  [11.7, 48.0],
];

const multiPolygonBoundary: Feature<MultiPolygon> = {
  type: "Feature",
  properties: {},
  geometry: { type: "MultiPolygon", coordinates: [[outerRing], [enclaveRing]] },
};

describe("createCityMask", () => {
  test("cuts every part of a multi polygon city out of the world", () => {
    // when
    const mask = createCityMask(multiPolygonBoundary);

    // then
    const [world, ...holes] = mask.geometry.coordinates;
    expect(world).toContainEqual([-180, -85]);
    expect(world).toContainEqual([180, 85]);
    expect(holes).toEqual([outerRing, enclaveRing]);
  });

  test("ignores inner rings of the city boundary", () => {
    // given
    const innerRing = [
      [11.45, 48.15],
      [11.5, 48.15],
      [11.5, 48.16],
      [11.45, 48.15],
    ];
    const boundary: Feature<Polygon> = {
      type: "Feature",
      properties: {},
      geometry: { type: "Polygon", coordinates: [outerRing, innerRing] },
    };

    // when
    const mask = createCityMask(boundary);

    // then
    expect(mask.geometry.coordinates.slice(1)).toEqual([outerRing]);
  });
});

/**
 * Collects the font names of a `text-font` value, which is either a plain list of font names
 * or an expression choosing between `literal` font lists.
 */
function fontNames(textFont: unknown): string[] {
  if (
    Array.isArray(textFont) &&
    textFont.every((entry) => typeof entry === "string")
  ) {
    return textFont;
  }
  return literalFontNames(textFont);
}

function literalFontNames(expression: unknown): string[] {
  if (!Array.isArray(expression)) {
    return [];
  }
  if (expression[0] === "literal") {
    return expression[1] as string[];
  }
  return expression.flatMap(literalFontNames);
}

describe("createMapStyle", () => {
  const options = {
    assetBaseUrl: "https://example.org/map/",
    tilesetFile: "muenchen-20261010.pmtiles",
    cityBoundary: multiPolygonBoundary,
  };

  test.for(["light", "dark"] as const)(
    "loads all assets of the %s theme from the given base URL",
    (theme) => {
      // when
      const style = createMapStyle({ ...options, theme });

      // then
      expect(style.sprite).toBe(`https://example.org/map/sprites/${theme}`);
      expect(style.sources.protomaps).toMatchObject({
        type: "vector",
        url: "pmtiles://https://example.org/map/muenchen-20261010.pmtiles",
      });
    }
  );

  test.for(["light", "dark"] as const)(
    "provides a font file for every font used by the %s theme",
    (theme) => {
      // when
      const style = createMapStyle({ ...options, theme });

      // then
      const usedFonts = new Set(
        style.layers.flatMap((layer) =>
          layer.type === "symbol" ? fontNames(layer.layout?.["text-font"]) : []
        )
      );
      expect([...usedFonts].sort()).toEqual(Object.keys(MAP_FONT_FACES).sort());
      expect(style.glyphs).toBeUndefined();
    }
  );

  test("attributes OpenStreetMap with a link to its copyright page", () => {
    // when
    const style = createMapStyle({ ...options, theme: "light" });

    // then
    expect(style.sources.protomaps).toMatchObject({
      attribution: MAP_ATTRIBUTION,
    });
    expect(MAP_ATTRIBUTION).toContain(
      'href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
    );
  });

  test("shows the basemap without city mask while the boundary is missing", () => {
    // when
    const style = createMapStyle({
      ...options,
      cityBoundary: undefined,
      theme: "light",
    });

    // then
    expect(Object.keys(style.sources)).toEqual(["protomaps"]);
    expect(style.layers.length).toBeGreaterThan(0);
    expect(
      style.layers.filter((layer) => layer.id.startsWith("city-mask"))
    ).toEqual([]);
  });

  test("draws the city mask above the basemap", () => {
    // when
    const style = createMapStyle({ ...options, theme: "light" });

    // then
    expect(style.layers.slice(-2).map((layer) => layer.id)).toEqual([
      "city-mask-fill",
      "city-mask-outline",
    ]);
  });
});
