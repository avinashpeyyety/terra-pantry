/**
 * Terra Pantry — MapLibre GL JS atlas entry.
 * Climate & food overlays on a real geographic basemap (no Mapbox token).
 */

import {
  createMap,
  addRegionLayers,
  buildRegistry,
  REGION_REGISTRY,
  setFeatureState,
  fitFocus,
  fitRegion,
  queryRegionFeature,
  LAYER_FILL,
} from './map.js';
import { initUI, showRegion, hidePanel, setHoverLabel } from './ui.js';

const loadingEl = document.getElementById('loading');

let map;
let meta = {};
let hoveredId = null;
let selectedId = null;

init().catch((err) => {
  console.error(err);
  if (loadingEl) {
    loadingEl.innerHTML =
      '<p>Failed to load atlas. Serve over HTTP (not file://) and check the console.</p>';
    loadingEl.classList.add('error');
  }
});

async function init() {
  const [dataRes, geoRes] = await Promise.all([
    fetch('./data/regions.json'),
    fetch('./data/regions.geojson'),
  ]);
  if (!dataRes.ok) throw new Error('Could not load data/regions.json');
  if (!geoRes.ok) throw new Error('Could not load data/regions.geojson');

  const data = await dataRes.json();
  const geojson = await geoRes.json();
  meta = data.meta || {};

  buildRegistry(data, geojson);

  map = createMap('map', meta);

  await new Promise((resolve, reject) => {
    map.on('load', resolve);
    map.on('error', (e) => {
      // Style tile errors are noisy; only reject hard failures before load
      if (!map.isStyleLoaded()) reject(e.error || e);
    });
  });

  addRegionLayers(map, geojson);
  fitFocus(map, meta, { duration: 0 });

  initUI({
    onClose: () => {
      if (selectedId) {
        setFeatureState(map, selectedId, { selected: false, hover: false });
        selectedId = null;
      }
      fitFocus(map, meta);
    },
  });

  setupInteraction();
  hideLoading();
}

function setupInteraction() {
  map.on('mousemove', LAYER_FILL, (e) => {
    map.getCanvas().style.cursor = 'pointer';
    const f = e.features?.[0];
    const id = f?.properties?.id || f?.id;
    if (!id || id === hoveredId) {
      if (id) setHoverLabel(f.properties?.shortName || f.properties?.name || null, e.point);
      return;
    }
    if (hoveredId && hoveredId !== selectedId) {
      setFeatureState(map, hoveredId, { hover: false });
    }
    hoveredId = id;
    if (hoveredId !== selectedId) {
      setFeatureState(map, hoveredId, { hover: true });
    }
    setHoverLabel(f.properties?.shortName || f.properties?.name || null, e.point);
  });

  map.on('mouseleave', LAYER_FILL, () => {
    map.getCanvas().style.cursor = '';
    if (hoveredId && hoveredId !== selectedId) {
      setFeatureState(map, hoveredId, { hover: false });
    }
    hoveredId = null;
    setHoverLabel(null);
  });

  map.on('click', LAYER_FILL, (e) => {
    const f = e.features?.[0];
    const id = f?.properties?.id || f?.id;
    if (!id) return;
    selectRegion(id);
  });

  map.on('click', (e) => {
    // Deselect when clicking empty basemap (panel close handler resets framing)
    const hit = queryRegionFeature(map, e.point);
    if (!hit && selectedId) {
      hidePanel();
    }
  });
}

function selectRegion(id) {
  if (selectedId && selectedId !== id) {
    setFeatureState(map, selectedId, { selected: false, hover: false });
  }
  selectedId = id;
  setFeatureState(map, selectedId, { selected: true, hover: false });

  const entry = REGION_REGISTRY.get(id);
  if (!entry) return;
  showRegion(entry.data);
  if (entry.bounds) {
    fitRegion(map, entry.bounds, { panelOpen: true });
  }
}

function hideLoading() {
  if (!loadingEl) return;
  loadingEl.classList.add('hidden');
  setTimeout(() => loadingEl.remove(), 500);
}

// Expose registry for console / future tools
window.TERRA_PANTRY = {
  get map() {
    return map;
  },
  REGION_REGISTRY,
};
