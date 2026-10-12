import type { Feature, MultiPolygon, Polygon, Position } from "geojson";
import type { FontFacesSpecification, StyleSpecification } from "maplibre-gl";

import robotoItalic from "@fontsource/roboto/files/roboto-latin-400-italic.woff2?url";
import robotoRegular from "@fontsource/roboto/files/roboto-latin-400-normal.woff2?url";
import robotoMedium from "@fontsource/roboto/files/roboto-latin-500-normal.woff2?url";
import robotoExtItalic from "@fontsource/roboto/files/roboto-latin-ext-400-italic.woff2?url";
import robotoExtRegular from "@fontsource/roboto/files/roboto-latin-ext-400-normal.woff2?url";
import robotoExtMedium from "@fontsource/roboto/files/roboto-latin-ext-500-normal.woff2?url";
import { layers, namedFlavor } from "@protomaps/basemaps";

export type MapTheme = "light" | "dark";

export const MAP_ATTRIBUTION =
  '<a href="https://github.com/protomaps/basemaps">Protomaps</a> © <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>';

const BASEMAP_SOURCE = "protomaps";
const CITY_MASK_SOURCE = "city-mask";

// Unicode ranges of the Fontsource "latin" and "latin-ext" subsets
const LATIN = [
  "U+0000-00FF",
  "U+0131",
  "U+0152-0153",
  "U+02BB-02BC",
  "U+02C6",
  "U+02DA",
  "U+02DC",
  "U+0304",
  "U+0308",
  "U+0329",
  "U+2000-206F",
  "U+20AC",
  "U+2122",
  "U+2191",
  "U+2193",
  "U+2212",
  "U+2215",
  "U+FEFF",
  "U+FFFD",
];
const LATIN_EXT = [
  "U+0100-02BA",
  "U+02BD-02C5",
  "U+02C7-02CC",
  "U+02CE-02D7",
  "U+02DD-02FF",
  "U+1D00-1DBF",
  "U+1E00-1E9F",
  "U+1EF2-1EFF",
  "U+2020",
  "U+20A0-20AB",
  "U+20AD-20C0",
  "U+2113",
  "U+2C60-2C7F",
  "U+A720-A7FF",
];

/**
 * Renders the map labels with Roboto, the font of the app, instead of downloading pre-rendered glyphs.
 * The keys are the font names the Protomaps style uses in its `text-font` properties.
 * Characters outside these ranges are drawn with a local system font.
 */
export const MAP_FONT_FACES: FontFacesSpecification = {
  "Noto Sans Regular": [
    { url: robotoRegular, "unicode-range": LATIN },
    { url: robotoExtRegular, "unicode-range": LATIN_EXT },
  ],
  "Noto Sans Medium": [
    { url: robotoMedium, "unicode-range": LATIN },
    { url: robotoExtMedium, "unicode-range": LATIN_EXT },
  ],
  "Noto Sans Italic": [
    { url: robotoItalic, "unicode-range": LATIN },
    { url: robotoExtItalic, "unicode-range": LATIN_EXT },
  ],
};

const WORLD_RING: Position[] = [
  [-180, -85],
  [180, -85],
  [180, 85],
  [-180, 85],
  [-180, -85],
];

export interface MapStyleOptions {
  /** Base URL under which the basemap assets (tileset, sprites) are served, ending with a slash. */
  assetBaseUrl: string;
  tilesetFile: string;
  theme: MapTheme;
  /** Dims everything outside the city once the boundary has been loaded. */
  cityBoundary?: Feature<Polygon | MultiPolygon>;
}

/**
 * Inverts the city boundary into a polygon covering the whole world except the city,
 * so everything outside the city can be dimmed.
 */
export function createCityMask(
  cityBoundary: Feature<Polygon | MultiPolygon>
): Feature<Polygon> {
  const { geometry } = cityBoundary;
  const polygons =
    geometry.type === "Polygon" ? [geometry.coordinates] : geometry.coordinates;
  const holes = polygons.flatMap((polygon) => polygon.slice(0, 1));

  return {
    type: "Feature",
    properties: {},
    geometry: { type: "Polygon", coordinates: [WORLD_RING, ...holes] },
  };
}

export function createMapStyle({
  assetBaseUrl,
  tilesetFile,
  theme,
  cityBoundary,
}: MapStyleOptions): StyleSpecification {
  const flavor = namedFlavor(theme);
  const style: StyleSpecification = {
    version: 8,
    "font-faces": MAP_FONT_FACES,
    sprite: `${assetBaseUrl}sprites/${theme}`,
    sources: {
      [BASEMAP_SOURCE]: {
        type: "vector",
        url: `pmtiles://${assetBaseUrl}${tilesetFile}`,
        attribution: MAP_ATTRIBUTION,
      },
    },
    layers: layers(BASEMAP_SOURCE, flavor, { lang: "de" }),
  };

  if (cityBoundary) {
    style.sources[CITY_MASK_SOURCE] = {
      type: "geojson",
      data: createCityMask(cityBoundary),
    };
    style.layers.push(
      {
        id: "city-mask-fill",
        type: "fill",
        source: CITY_MASK_SOURCE,
        paint: { "fill-color": flavor.earth, "fill-opacity": 0.75 },
      },
      {
        id: "city-mask-outline",
        type: "line",
        source: CITY_MASK_SOURCE,
        paint: {
          "line-color": flavor.boundaries,
          "line-width": 1.5,
          "line-dasharray": [3, 2],
        },
      }
    );
  }

  return style;
}
