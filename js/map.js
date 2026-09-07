/**
 * Terra Pantry — MapLibre map, region layers, REGION_REGISTRY.
 *
 * Extension pattern:
 *   1. Add features to data/regions.geojson (or a new FeatureCollection).
 *   2. Add matching climate/food entries to data/regions.json (same id).
 *   3. Optionally merge extra GeoJSON sources in addRegionLayers().
 *   4. Call fitWorld() / fitFocus() for overview framing.
 */

/** @type {Map<string, { id: string, data: object, bounds: object|null, feature: object|null }>} */
export const REGION_REGISTRY = new Map();

export const LAYER_FILL = 'regions-fill';
export const LAYER_LINE = 'regions-outline';
export const LAYER_HIGHLIGHT = 'regions-highlight';
export const SOURCE_REGIONS = 'regions';

/** Free dark basemap — no Mapbox / API token required */
export const BASEMAP_STYLE = 'https://tiles.openfreemap.org/styles/dark';

/** In-memory copy of the regions FeatureCollection (avoids private source._data). */
let regionsCollection = { type: 'FeatureCollection', features: [] };

export function getRegionsGeoJSON() {
  return regionsCollection;
}

const BAND_COLORS = {
  mediterranean: '#c4a574',
  continental: '#7a9a8a',
  'humid-subtropical': '#a89868',
  'semi-arid': '#b88858',
  mixed: '#8a9a7a',
  alpine: '#6a9a7a',
};

/**
 * Build registry from regions.json + optional GeoJSON features.
 * @param {{ regions: object[], meta?: object }} data
 * @param {GeoJSON.FeatureCollection|null} geojson
 */
export function buildRegistry(data, geojson = null) {
  REGION_REGISTRY.clear();
  const byId = new Map();
  if (geojson?.features) {
    for (const f of geojson.features) {
      const id = f.properties?.id || f.id;
      if (id) byId.set(id, f);
    }
  }

  for (const region of data.regions || []) {
    const feature = byId.get(region.id) || null;
    REGION_REGISTRY.set(region.id, {
      id: region.id,
      data: region,
      bounds: region.bounds || null,
      feature,
    });
  }
  return REGION_REGISTRY;
}

/**
 * Create MapLibre map centered on Balkans / Mediterranean.
 * @param {string} containerId
 * @param {object} meta from regions.json
 */
export function createMap(containerId, meta = {}) {
  const maplibregl = window.maplibregl;
  if (!maplibregl) throw new Error('maplibre-gl failed to load from CDN');

  const mapCfg = meta.map || {};
  const center = mapCfg.center || [
    meta.projection?.centerLon ?? 20.5,
    meta.projection?.centerLat ?? 41.5,
  ];
  const zoom = mapCfg.zoom ?? 5.2;

  const map = new maplibregl.Map({
    container: containerId,
    style: BASEMAP_STYLE,
    center,
    zoom,
    minZoom: 2,
    maxZoom: 12,
    attributionControl: true,
    cooperativeGestures: false,
  });

  map.addControl(new maplibregl.NavigationControl({ visualizePitch: false }), 'bottom-right');
  map.addControl(new maplibregl.ScaleControl({ maxWidth: 120 }), 'bottom-left');

  return map;
}

/**
 * Add GeoJSON region fill / outline / highlight layers.
 * Uses soft earth tones from feature properties (fallback: climate band).
 * @param {maplibregl.Map} map
 * @param {GeoJSON.FeatureCollection} geojson
 */
export function addRegionLayers(map, geojson) {
  regionsCollection = geojson;
  if (map.getSource(SOURCE_REGIONS)) {
    map.getSource(SOURCE_REGIONS).setData(geojson);
    return;
  }

  map.addSource(SOURCE_REGIONS, {
    type: 'geojson',
    data: geojson,
    promoteId: 'id',
  });

  map.addLayer({
    id: LAYER_FILL,
    type: 'fill',
    source: SOURCE_REGIONS,
    paint: {
      'fill-color': [
        'coalesce',
        ['get', 'color'],
        [
          'match',
          ['get', 'climateBand'],
          'mediterranean', BAND_COLORS.mediterranean,
          'continental', BAND_COLORS.continental,
          'humid-subtropical', BAND_COLORS['humid-subtropical'],
          'semi-arid', BAND_COLORS['semi-arid'],
          'alpine', BAND_COLORS.alpine,
          BAND_COLORS.mixed,
        ],
      ],
      'fill-opacity': [
        'case',
        ['boolean', ['feature-state', 'selected'], false],
        0.78,
        ['boolean', ['feature-state', 'hover'], false],
        0.62,
        0.42,
      ],
    },
  });

  map.addLayer({
    id: LAYER_LINE,
    type: 'line',
    source: SOURCE_REGIONS,
    paint: {
      'line-color': [
        'case',
        ['boolean', ['feature-state', 'selected'], false],
        '#f2e8d8',
        ['boolean', ['feature-state', 'hover'], false],
        '#e8d4a8',
        'rgba(242, 232, 216, 0.55)',
      ],
      'line-width': [
        'case',
        ['boolean', ['feature-state', 'selected'], false],
        2.4,
        ['boolean', ['feature-state', 'hover'], false],
        1.8,
        1.1,
      ],
      'line-opacity': 0.95,
    },
  });

  // Soft glow ring for selected / hover (duplicate line, wider, translucent)
  map.addLayer({
    id: LAYER_HIGHLIGHT,
    type: 'line',
    source: SOURCE_REGIONS,
    paint: {
      'line-color': '#d4a060',
      'line-width': 6,
      'line-opacity': [
        'case',
        ['boolean', ['feature-state', 'selected'], false],
        0.35,
        ['boolean', ['feature-state', 'hover'], false],
        0.22,
        0,
      ],
      'line-blur': 2,
    },
  });
}

/**
 * Merge an additional FeatureCollection into the regions source (continent extension).
 * @param {maplibregl.Map} map
 * @param {GeoJSON.FeatureCollection} extra
 */
export function mergeRegionGeoJSON(map, extra) {
  const src = map.getSource(SOURCE_REGIONS);
  if (!src) throw new Error('regions source missing — call addRegionLayers first');
  const features = [...(regionsCollection.features || []), ...(extra.features || [])];
  regionsCollection = { type: 'FeatureCollection', features };
  src.setData(regionsCollection);
}

export function setFeatureState(map, id, state) {
  if (!id || !map.getSource(SOURCE_REGIONS)) return;
  map.setFeatureState({ source: SOURCE_REGIONS, id }, state);
}

export function clearFeatureState(map, id) {
  if (!id || !map.getSource(SOURCE_REGIONS)) return;
  map.removeFeatureState({ source: SOURCE_REGIONS, id });
}

/** Fit to atlas focus (Balkans / Med). */
export function fitFocus(map, meta = {}, options = {}) {
  const b = meta.map?.bounds;
  if (b && b.length === 4) {
    map.fitBounds(
      [
        [b[0], b[1]],
        [b[2], b[3]],
      ],
      {
        padding: options.padding ?? { top: 80, bottom: 60, left: 40, right: 40 },
        duration: options.duration ?? 900,
        maxZoom: options.maxZoom ?? 6.5,
      }
    );
    return;
  }
  map.easeTo({
    center: meta.map?.center || [20.5, 41.5],
    zoom: meta.map?.zoom ?? 5.2,
    duration: options.duration ?? 900,
  });
}

/** Fit to a single region bounds object {minLon,maxLon,minLat,maxLat}. */
export function fitRegion(map, bounds, options = {}) {
  if (!bounds) return;
  const rightPad = options.panelOpen ? 400 : 40;
  map.fitBounds(
    [
      [bounds.minLon, bounds.minLat],
      [bounds.maxLon, bounds.maxLat],
    ],
    {
      padding: options.padding ?? { top: 100, bottom: 80, left: 48, right: rightPad },
      duration: options.duration ?? 850,
      maxZoom: options.maxZoom ?? 7.5,
    }
  );
}

/**
 * Future world overview — fit all features currently in the regions source.
 * @param {maplibregl.Map} map
 */
export function fitWorld(map, options = {}) {
  const data = regionsCollection;
  if (!data?.features?.length) {
    map.fitBounds(
      [
        [-180, -55],
        [180, 75],
      ],
      { padding: 40, duration: options.duration ?? 1200 }
    );
    return;
  }

  let minLon = Infinity;
  let minLat = Infinity;
  let maxLon = -Infinity;
  let maxLat = -Infinity;

  const walk = (coords) => {
    if (typeof coords[0] === 'number') {
      const [lon, lat] = coords;
      minLon = Math.min(minLon, lon);
      maxLon = Math.max(maxLon, lon);
      minLat = Math.min(minLat, lat);
      maxLat = Math.max(maxLat, lat);
      return;
    }
    for (const c of coords) walk(c);
  };

  for (const f of data.features) {
    if (f.geometry?.coordinates) walk(f.geometry.coordinates);
  }

  if (!Number.isFinite(minLon)) return;
  map.fitBounds(
    [
      [minLon, minLat],
      [maxLon, maxLat],
    ],
    {
      padding: options.padding ?? 48,
      duration: options.duration ?? 1200,
      maxZoom: options.maxZoom ?? 4,
    }
  );
}

export function queryRegionFeature(map, point) {
  const feats = map.queryRenderedFeatures(point, {
    layers: [LAYER_FILL],
  });
  return feats[0] || null;
}
