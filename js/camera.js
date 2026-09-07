/**
 * Camera framing helpers for Terra Pantry.
 * Extension: add continent-level framing by registering bounds in REGION_REGISTRY
 * or by calling frameBounds() with a geographic bounding box.
 */

import * as THREE from 'three';

const DEFAULT_CENTER = { lon: 20.5, lat: 41.5 };
const DEFAULT_SCALE = 42000;

/**
 * Convert lon/lat to scene XZ using the same projection as the map.
 */
export function projectLonLat(lon, lat, center = DEFAULT_CENTER, scale = DEFAULT_SCALE) {
  const x = ((lon - center.lon) * Math.PI) / 180 * scale;
  const z = -((lat - center.lat) * Math.PI) / 180 * scale;
  return { x, z };
}

/**
 * Frame the camera/orbit target on a geographic bounding box.
 * @param {THREE.PerspectiveCamera} camera
 * @param {OrbitControls} controls
 * @param {{ minLon:number, maxLon:number, minLat:number, maxLat:number }} bounds
 * @param {{ centerLon?:number, centerLat?:number, scale?:number }} projection
 * @param {{ padding?:number, duration?:number }} opts
 */
export function frameBounds(camera, controls, bounds, projection = {}, opts = {}) {
  const center = {
    lon: projection.centerLon ?? DEFAULT_CENTER.lon,
    lat: projection.centerLat ?? DEFAULT_CENTER.lat,
  };
  const scale = projection.scale ?? DEFAULT_SCALE;
  const padding = opts.padding ?? 1.35;

  const sw = projectLonLat(bounds.minLon, bounds.minLat, center, scale);
  const ne = projectLonLat(bounds.maxLon, bounds.maxLat, center, scale);

  const cx = (sw.x + ne.x) / 2;
  const cz = (sw.z + ne.z) / 2;
  const spanX = Math.abs(ne.x - sw.x) * padding;
  const spanZ = Math.abs(ne.z - sw.z) * padding;
  const span = Math.max(spanX, spanZ, 800);

  const fov = (camera.fov * Math.PI) / 180;
  const dist = (span / 2) / Math.tan(fov / 2);

  const target = new THREE.Vector3(cx, 0, cz);
  const position = new THREE.Vector3(
    cx + dist * 0.35,
    dist * 0.72,
    cz + dist * 0.85
  );

  animateCamera(camera, controls, position, target, opts.duration ?? 900);
}

/**
 * Frame the whole focus atlas (Balkans + Med).
 */
export function frameAtlas(camera, controls, projection = {}) {
  frameBounds(
    camera,
    controls,
    { minLon: 5, maxLon: 32, minLat: 35, maxLat: 48 },
    projection,
    { padding: 1.15, duration: 0 }
  );
}

function animateCamera(camera, controls, toPos, toTarget, duration) {
  if (!duration || duration <= 0) {
    camera.position.copy(toPos);
    controls.target.copy(toTarget);
    controls.update();
    return;
  }

  const fromPos = camera.position.clone();
  const fromTarget = controls.target.clone();
  const start = performance.now();

  function tick(now) {
    const t = Math.min(1, (now - start) / duration);
    const e = 1 - Math.pow(1 - t, 3);
    camera.position.lerpVectors(fromPos, toPos, e);
    controls.target.lerpVectors(fromTarget, toTarget, e);
    controls.update();
    if (t < 1) requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);
}
