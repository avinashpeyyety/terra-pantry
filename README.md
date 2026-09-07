# Terra Pantry

Interactive climate and food atlas of the Balkans and Mediterranean — a draft encyclopedia designed to expand into a zoomable world pantry map.

Warm earth / olive / Aegean aesthetic on a real geographic basemap (MapLibre GL JS + OpenFreeMap). Static site — no build step, no Mapbox token.

## Quick start

Serve the folder over HTTP (ES modules and `fetch` require a local static server, **not** `file://`).

```bash
cd terra-pantry
python3 -m http.server 8080
```

Open http://127.0.0.1:8080

Also fine: `npx serve`, nginx, or GitHub Pages.

## GitHub Pages

1. Push this repo (or this folder as the repo root / `docs`).
2. Settings → Pages → Deploy from branch → root (or `/docs`).
3. MapLibre loads from CDN (`unpkg.com/maplibre-gl`); basemap tiles from OpenFreeMap (no API key).

Keep relative paths (`./js/`, `./data/`) if hosting under a subpath.

## Controls

| Action | Result |
|--------|--------|
| Drag | Pan map |
| Scroll | Zoom |
| Hover region | Highlight + name label |
| Click region | Side panel (climate + food) + fitBounds |
| Esc / close | Close panel, reset framing |
| Click empty map | Deselect |

## Project layout

```
terra-pantry/
├── index.html              # MapLibre CSS/JS CDN + app shell
├── favicon.svg
├── css/styles.css
├── js/
│   ├── main.js             # load data, wire map + UI
│   ├── map.js              # MapLibre layers, REGION_REGISTRY, fitBounds
│   └── ui.js               # side panel / hover label
├── data/
│   ├── regions.json        # climate + food copy, meta, bounds
│   └── regions.geojson     # FeatureCollection polygons (17 regions)
└── README.md
```

## Data model

### `data/regions.json`

Each region:

- `id`, `name`, `shortName`, `color`, `highlight`
- `climateBand` — mediterranean | continental | humid-subtropical | semi-arid | mixed | alpine
- `bounds` — `{ minLon, maxLon, minLat, maxLat }` for click framing
- `outline` — simplified lon/lat ring (source for GeoJSON; kept for editing)
- `climate` — Köppen-ish zone, summer/winter bands, rainfall note
- `food` — ingredients, dishes, agriculture note

`meta.map` holds default `center`, `zoom`, and overview `bounds`.

### `data/regions.geojson`

Polygon FeatureCollection. Feature `properties.id` matches `regions.json`. Fill color prefers `properties.color`, with `climateBand` as fallback.

Facts are curated draft encyclopedia notes — honest summaries, not exhaustive. Outlines are schematic, not survey-grade.

## Extension hooks

### REGION_REGISTRY

Every region is registered after load:

```js
import { REGION_REGISTRY } from './map.js';
REGION_REGISTRY.get('greece'); // { id, data, bounds, feature }
```

Also available as `window.TERRA_PANTRY.REGION_REGISTRY` in the browser console.

### Camera framing

```js
import { fitFocus, fitRegion, fitWorld } from './map.js';
fitRegion(map, entry.bounds, { panelOpen: true });
fitWorld(map);   // later: world encyclopedia overview
fitFocus(map, meta);
```

### Adding a continent

1. **GeoJSON** — Add polygons to `data/regions.geojson` (or a new file such as `data/regions-asia.geojson`). Prefer 10–40 points per country.
2. **Copy** — Add matching climate/food objects to `data/regions.json` (same `id`).
3. **Load** — In `main.js`, fetch the extra GeoJSON and either merge features before `addRegionLayers`, or call `mergeRegionGeoJSON(map, extra)` after.
4. **Registry** — `buildRegistry()` already indexes every `regions.json` entry; ensure ids match.
5. **Framing** — Keep per-region `bounds`. For a world overview button, call `fitWorld(map)`.
6. **Aesthetic** — Reuse palette tokens in `css/styles.css`; region `color` / `highlight` stay in JSON.

Sketch for multi-file load:

```js
const [med, asia] = await Promise.all([
  fetch('./data/regions.geojson').then((r) => r.json()),
  fetch('./data/regions-asia.geojson').then((r) => r.json()),
]);
const geojson = {
  type: 'FeatureCollection',
  features: [...med.features, ...asia.features],
};
```

## Stack

- [MapLibre GL JS](https://maplibre.org/) v5 (CDN)
- [OpenFreeMap](https://openfreemap.org/) dark style — free tiles, no API key
- Vanilla ES modules — no bundler required

## License

Draft content and code for personal / educational use. Country outlines are schematic, not survey-grade. Basemap © OpenFreeMap / OpenStreetMap contributors.
