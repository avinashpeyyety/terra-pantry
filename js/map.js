/**
 * Map mesh builder for Terra Pantry.
 *
 * REGION_REGISTRY — extension hook:
 *   Import and mutate this Map to register additional continents/regions
 *   at runtime, or add entries to data/regions.json and reload.
 *   Each entry: { id, mesh, data, bounds }.
 */

import * as THREE from 'three';
import { projectLonLat } from './camera.js';

/** @type {Map<string, { id: string, mesh: THREE.Mesh, data: object, bounds: object }>} */
export const REGION_REGISTRY = new Map();

const DEFAULT_CENTER = { lon: 20.5, lat: 41.5 };
const DEFAULT_SCALE = 42000;

/**
 * Build ocean + extruded country meshes from regions.json payload.
 * @returns {{ group: THREE.Group, registry: typeof REGION_REGISTRY }}
 */
export function buildMap(data) {
  const group = new THREE.Group();
  group.name = 'terra-map';

  const proj = data.meta?.projection || {};
  const center = {
    lon: proj.centerLon ?? DEFAULT_CENTER.lon,
    lat: proj.centerLat ?? DEFAULT_CENTER.lat,
  };
  const scale = proj.scale ?? DEFAULT_SCALE;

  group.add(createOcean(center, scale));
  group.add(createHorizonGlow());

  for (const region of data.regions || []) {
    const mesh = createRegionMesh(region, center, scale);
    if (!mesh) continue;
    group.add(mesh);

    REGION_REGISTRY.set(region.id, {
      id: region.id,
      mesh,
      data: region,
      bounds: region.bounds,
    });
  }

  return { group, registry: REGION_REGISTRY };
}

function createOcean(center, scale) {
  const geo = new THREE.CircleGeometry(28000, 96);
  geo.rotateX(-Math.PI / 2);
  const mat = new THREE.MeshStandardMaterial({
    color: 0x1a4a6e,
    roughness: 0.55,
    metalness: 0.15,
    transparent: true,
    opacity: 0.92,
  });
  const ocean = new THREE.Mesh(geo, mat);
  ocean.position.y = -0.05;
  ocean.name = 'ocean';
  ocean.receiveShadow = true;

  // Soft Aegean ring
  const ringGeo = new THREE.RingGeometry(18000, 27500, 96);
  ringGeo.rotateX(-Math.PI / 2);
  const ringMat = new THREE.MeshBasicMaterial({
    color: 0x0d2a44,
    transparent: true,
    opacity: 0.45,
    side: THREE.DoubleSide,
  });
  const ring = new THREE.Mesh(ringGeo, ringMat);
  ring.position.y = -0.04;

  const g = new THREE.Group();
  g.add(ocean, ring);
  return g;
}

function createHorizonGlow() {
  const geo = new THREE.PlaneGeometry(60000, 60000);
  const mat = new THREE.MeshBasicMaterial({
    color: 0x2a1810,
    transparent: true,
    opacity: 0.35,
    side: THREE.DoubleSide,
  });
  const plane = new THREE.Mesh(geo, mat);
  plane.rotation.x = -Math.PI / 2;
  plane.position.y = -0.2;
  return plane;
}

function createRegionMesh(region, center, scale) {
  const outline = region.outline;
  if (!outline || outline.length < 3) return null;

  const shape = new THREE.Shape();
  outline.forEach(([lon, lat], i) => {
    const { x, z } = projectLonLat(lon, lat, center, scale);
    // Shape uses XY; we map lon→x, lat→y then rotate to XZ
    if (i === 0) shape.moveTo(x, -z);
    else shape.lineTo(x, -z);
  });

  const height = (region.extrudeHeight ?? 0.3) * 400;
  const geom = new THREE.ExtrudeGeometry(shape, {
    depth: height,
    bevelEnabled: true,
    bevelThickness: 40,
    bevelSize: 35,
    bevelSegments: 2,
  });

  // Extrude along +Z in shape space; rotate so depth becomes +Y
  geom.rotateX(-Math.PI / 2);

  const baseColor = new THREE.Color(region.color || '#a89070');
  const mat = new THREE.MeshStandardMaterial({
    color: baseColor,
    roughness: 0.72,
    metalness: 0.08,
    flatShading: false,
  });

  const mesh = new THREE.Mesh(geom, mat);
  mesh.name = region.id;
  mesh.userData = {
    regionId: region.id,
    baseColor: baseColor.clone(),
    highlightColor: new THREE.Color(region.highlight || '#e8d4a8'),
    selectedColor: new THREE.Color(region.highlight || '#e8d4a8').offsetHSL(0.02, 0.1, 0.08),
    isRegion: true,
  };
  mesh.castShadow = true;
  mesh.receiveShadow = true;

  // Thin rim edge for polish
  const edges = new THREE.EdgesGeometry(geom, 28);
  const line = new THREE.LineSegments(
    edges,
    new THREE.LineBasicMaterial({ color: 0x3a2a18, transparent: true, opacity: 0.35 })
  );
  mesh.add(line);

  return mesh;
}

/**
 * Apply hover / selected visual state.
 */
export function setRegionState(mesh, state) {
  if (!mesh?.userData?.isRegion) return;
  const mat = mesh.material;
  if (state === 'hover') {
    mat.color.copy(mesh.userData.highlightColor);
    mat.emissive = mat.emissive || new THREE.Color(0x000000);
    mat.emissive.setHex(0x332208);
    mat.emissiveIntensity = 0.25;
  } else if (state === 'selected') {
    mat.color.copy(mesh.userData.selectedColor);
    mat.emissive = mat.emissive || new THREE.Color(0x000000);
    mat.emissive.setHex(0x443310);
    mat.emissiveIntensity = 0.35;
  } else {
    mat.color.copy(mesh.userData.baseColor);
    if (mat.emissive) {
      mat.emissive.setHex(0x000000);
      mat.emissiveIntensity = 0;
    }
  }
}

export function getProjectionFromData(data) {
  const proj = data.meta?.projection || {};
  return {
    centerLon: proj.centerLon ?? DEFAULT_CENTER.lon,
    centerLat: proj.centerLat ?? DEFAULT_CENTER.lat,
    scale: proj.scale ?? DEFAULT_SCALE,
  };
}
