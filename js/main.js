/**
 * Terra Pantry — main entry
 * Static Three.js atlas: Balkans + Mediterranean climate & food.
 */

import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { buildMap, setRegionState, REGION_REGISTRY, getProjectionFromData } from './map.js';
import { frameAtlas, frameBounds } from './camera.js';
import { initUI, showRegion, hidePanel, setHoverLabel } from './ui.js';

const canvasHost = document.getElementById('canvas-host');
const loadingEl = document.getElementById('loading');

let scene, camera, renderer, controls;
let raycaster, pointer;
let hovered = null;
let selected = null;
let projection = {};

init().catch((err) => {
  console.error(err);
  if (loadingEl) {
    loadingEl.textContent = 'Failed to load atlas. Check console / serve over http.';
    loadingEl.classList.add('error');
  }
});

async function init() {
  const res = await fetch('./data/regions.json');
  if (!res.ok) throw new Error('Could not load data/regions.json');
  const data = await res.json();
  projection = getProjectionFromData(data);

  setupScene();
  const { group } = buildMap(data);
  scene.add(group);

  setupLights();
  setupInteraction();
  initUI({
    onClose: () => {
      if (selected) {
        setRegionState(selected, 'idle');
        selected = null;
      }
      frameAtlas(camera, controls, projection);
    },
  });

  frameAtlas(camera, controls, projection);
  hideLoading();
  animate();
}

function setupScene() {
  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x1c1410);
  scene.fog = new THREE.FogExp2(0x1c1410, 0.000028);

  const w = canvasHost.clientWidth;
  const h = canvasHost.clientHeight;
  camera = new THREE.PerspectiveCamera(42, w / h, 10, 120000);
  camera.position.set(4200, 9800, 12000);

  renderer = new THREE.WebGLRenderer({
    antialias: true,
    powerPreference: 'high-performance',
  });
  renderer.setSize(w, h);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.15;
  canvasHost.appendChild(renderer.domElement);

  controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.06;
  controls.minDistance = 1200;
  controls.maxDistance = 38000;
  controls.maxPolarAngle = Math.PI * 0.48;
  controls.target.set(0, 0, 0);
  controls.update();

  window.addEventListener('resize', onResize);
}

function setupLights() {
  const ambient = new THREE.AmbientLight(0xfff0e0, 0.45);
  scene.add(ambient);

  const sun = new THREE.DirectionalLight(0xffe2b8, 1.35);
  sun.position.set(8000, 14000, 6000);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  sun.shadow.camera.near = 500;
  sun.shadow.camera.far = 40000;
  sun.shadow.camera.left = -16000;
  sun.shadow.camera.right = 16000;
  sun.shadow.camera.top = 16000;
  sun.shadow.camera.bottom = -16000;
  sun.shadow.bias = -0.0002;
  scene.add(sun);

  const fill = new THREE.DirectionalLight(0x6a9abb, 0.35);
  fill.position.set(-6000, 5000, -4000);
  scene.add(fill);

  const hemi = new THREE.HemisphereLight(0xd4c4a8, 0x1a3a4a, 0.4);
  scene.add(hemi);
}

function setupInteraction() {
  raycaster = new THREE.Raycaster();
  pointer = new THREE.Vector2();

  const el = renderer.domElement;
  el.addEventListener('pointermove', onPointerMove);
  el.addEventListener('click', onClick);
  el.addEventListener('pointerleave', () => {
    clearHover();
    setHoverLabel(null);
  });
}

function getRegionMeshes() {
  return [...REGION_REGISTRY.values()].map((r) => r.mesh);
}

function pickRegion(event) {
  const rect = renderer.domElement.getBoundingClientRect();
  pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
  pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
  raycaster.setFromCamera(pointer, camera);
  const hits = raycaster.intersectObjects(getRegionMeshes(), false);
  return hits[0]?.object ?? null;
}

function onPointerMove(event) {
  const mesh = pickRegion(event);
  if (mesh === hovered) return;
  clearHover();
  hovered = mesh;
  if (hovered && hovered !== selected) {
    setRegionState(hovered, 'hover');
  }
  const entry = hovered ? REGION_REGISTRY.get(hovered.userData.regionId) : null;
  setHoverLabel(entry?.data?.shortName || entry?.data?.name || null);
  renderer.domElement.style.cursor = hovered ? 'pointer' : 'grab';
}

function clearHover() {
  if (hovered && hovered !== selected) {
    setRegionState(hovered, 'idle');
  }
  hovered = null;
}

function onClick(event) {
  const mesh = pickRegion(event);
  if (!mesh) {
    if (selected) {
      setRegionState(selected, 'idle');
      selected = null;
      hidePanel();
      frameAtlas(camera, controls, projection);
    }
    return;
  }

  if (selected && selected !== mesh) {
    setRegionState(selected, 'idle');
  }
  selected = mesh;
  setRegionState(selected, 'selected');

  const entry = REGION_REGISTRY.get(mesh.userData.regionId);
  if (entry) {
    showRegion(entry.data);
    if (entry.bounds) {
      frameBounds(camera, controls, entry.bounds, projection, {
        padding: 1.6,
        duration: 850,
      });
    }
  }
}

function onResize() {
  const w = canvasHost.clientWidth;
  const h = canvasHost.clientHeight;
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
  renderer.setSize(w, h);
}

function animate() {
  requestAnimationFrame(animate);
  controls.update();
  renderer.render(scene, camera);
}

function hideLoading() {
  if (!loadingEl) return;
  loadingEl.classList.add('hidden');
  setTimeout(() => loadingEl.remove(), 500);
}
