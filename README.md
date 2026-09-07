# Terra Pantry

Interactive climate and food atlas of the Balkans and Mediterranean — a draft encyclopedia designed to expand into a zoomable world pantry map.

Warm earth / olive / Aegean aesthetic. Static Three.js site (no build step).

## Quick start

Serve the folder over HTTP (ES modules and fetch require a local static server, not file://).

From this directory, run a static file server on port 8080, then open http://localhost:8080

Examples: the Python http.server module, npx serve, or nginx.

## GitHub Pages

1. Push this repo (or this folder as the repo root / docs).
2. Settings, Pages, Deploy from branch, root (or /docs).
3. Three.js r170 is vendored under vendor/three (import map); works over HTTP without CDN.

Keep relative paths (./js/, ./data/) if hosting under a subpath.

## Controls

| Action | Result |
|--------|--------|
| Drag | Orbit camera |
| Scroll | Zoom |
| Hover region | Highlight + name label |
| Click region | Side panel (climate + food) + camera frame |
| Esc / close | Close panel, reset framing |
| Click ocean / empty | Deselect |

## Project layout

    terra-pantry/
    ├── index.html          # importmap to vendored three@0.170
    ├── vendor/three/       # three.module.js + OrbitControls
    ├── favicon.svg
    ├── css/styles.css
    ├── js/
    │   ├── main.js         # scene, lights, raycast, loop
    │   ├── map.js          # extruded regions, REGION_REGISTRY
    │   ├── camera.js       # lon/lat projection + framing
    │   └── ui.js           # side panel / hover label
    ├── data/regions.json   # climate + food + outlines
    └── README.md

## Data model (data/regions.json)

Each region:

- id, name, shortName, color, highlight
- bounds — camera framing box (minLon/maxLon/minLat/maxLat)
- outline — simplified lon/lat ring (closed polygon)
- extrudeHeight — relative 3D thickness
- climate — Koppen-ish zone, summer/winter bands, rainfall note
- food — ingredients, dishes, agriculture note

Facts are curated draft encyclopedia notes — honest summaries, not exhaustive.

## Extension hooks

### REGION_REGISTRY

In js/map.js, every built mesh is registered:

    import { REGION_REGISTRY } from './map.js';
    REGION_REGISTRY.get('greece'); // { id, mesh, data, bounds }

Use this to attach tools, filters, or multi-select without rewriting the map builder.

### Camera framing

    import { frameBounds, frameAtlas } from './camera.js';
    frameBounds(camera, controls, region.bounds, projection, { padding: 1.5, duration: 800 });

### Adding a continent

1. Data — Add region objects to data/regions.json (or a new file such as data/regions-asia.json merged at load time in main.js).
2. Projection — For a distant continent, either shift meta.projection.centerLon/centerLat toward the new focus, keep the Med center and accept long travel, or introduce continent groups with their own projection and overview bounds.
3. Outlines — Provide simplified lon/lat polygons (GeoJSON exterior rings). Prefer 10–40 points per country for performance.
4. Registry — Meshes auto-register on buildMap(). Optional: namespace ids (asia:japan) and filter UI by prefix.
5. Camera — Set per-region bounds so click-to-frame works. Add a continent overview control that calls frameBounds with the continent bbox.
6. Aesthetic — Reuse palette tokens in css/styles.css; region color/highlight stay in JSON.

Sketch for multi-file load:

    const [med, asia] = await Promise.all([
      fetch('./data/regions.json').then((r) => r.json()),
      fetch('./data/regions-asia.json').then((r) => r.json()),
    ]);
    const data = { meta: med.meta, regions: [...med.regions, ...asia.regions] };

## Stack

- Three.js r170 (vendored under vendor/three; import map)
- OrbitControls from three/addons
- Vanilla ES modules — no bundler required

## License

Draft content and code for personal / educational use. Country outlines are schematic, not survey-grade.
