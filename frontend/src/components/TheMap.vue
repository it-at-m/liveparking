<template>
  <div
    ref="mapContainer"
    class="the-map"
    role="region"
    :aria-label="t('components.theMap.label')"
  />
</template>

<script setup lang="ts">
import type { MapTheme } from "@/util/mapStyle";
import type { Feature, MultiPolygon, Polygon } from "geojson";

import { addProtocol, Map as MapLibreMap, setWorkerUrl } from "maplibre-gl";
import maplibreWorkerUrl from "maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url";
import { Protocol } from "pmtiles";
import { onBeforeUnmount, onMounted, useTemplateRef, watch } from "vue";
import { useI18n } from "vue-i18n";
import { useTheme } from "vuetify";

import "maplibre-gl/dist/maplibre-gl.css";

import { STATUS_INDICATORS } from "@/constants";
import { useSnackbarStore } from "@/stores/snackbar";
import { createMapStyle } from "@/util/mapStyle";
import basemap from "../../basemap.json";

// MapLibre derives its worker URL at runtime, which bundlers cannot follow
setWorkerUrl(maplibreWorkerUrl);
addProtocol("pmtiles", new Protocol().tile);

const ASSET_BASE_URL = `${window.location.origin}${import.meta.env.BASE_URL}map/`;
const [minLon, minLat, maxLon, maxLat] = basemap.bbox as [
  number,
  number,
  number,
  number,
];

const { t } = useI18n();
const theme = useTheme();
const snackbarStore = useSnackbarStore();
const mapContainer = useTemplateRef("mapContainer");

let map: MapLibreMap | undefined;
let cityBoundary: Feature<Polygon | MultiPolygon> | undefined;
let loadErrorShown = false;

// Failing tile requests raise one error per tile, the user only needs to be told once
function showLoadError(error: unknown) {
  console.debug(error);
  if (!loadErrorShown) {
    loadErrorShown = true;
    snackbarStore.push({
      text: t("components.theMap.loadError"),
      color: STATUS_INDICATORS.ERROR,
    });
  }
}

function currentStyle() {
  const mapTheme: MapTheme = theme.global.current.value.dark ? "dark" : "light";
  return createMapStyle({
    assetBaseUrl: ASSET_BASE_URL,
    tilesetFile: basemap.file,
    theme: mapTheme,
    cityBoundary,
  });
}

async function fetchCityBoundary(): Promise<Feature<Polygon | MultiPolygon>> {
  const response = await fetch(`${ASSET_BASE_URL}muenchen-grenze.geojson`);
  if (!response.ok) {
    throw new Error(`City boundary request failed: ${response.status}`);
  }
  return response.json();
}

onMounted(async () => {
  if (!mapContainer.value) {
    return;
  }
  try {
    map = new MapLibreMap({
      container: mapContainer.value,
      style: currentStyle(),
      bounds: [minLon, minLat, maxLon, maxLat],
      maxBounds: [minLon, minLat, maxLon, maxLat],
      maxZoom: 18,
      attributionControl: { compact: true },
    });
    map.on("error", ({ error }) => showLoadError(error));
  } catch (error) {
    showLoadError(error);
    return;
  }

  // The boundary only dims the surroundings, so the map stays usable without it
  try {
    cityBoundary = await fetchCityBoundary();
    map?.setStyle(currentStyle());
  } catch (error) {
    console.debug(error);
  }
});

watch(
  () => theme.global.current.value.dark,
  () => map?.setStyle(currentStyle())
);

onBeforeUnmount(() => {
  map?.remove();
  map = undefined;
});
</script>

<style scoped>
.the-map {
  width: 100%;
  height: 100%;
}
</style>
