import * as THREE from './vendor/three/three.module.js';
import { OrbitControls } from './vendor/three/OrbitControls.js';

const picker = document.querySelector('#panoramaPicker');
const button = document.querySelector('#openPanorama');
const dialog = document.querySelector('#panoramaDialog');
const stage = document.querySelector('#panoramaStage');
const status = document.querySelector('#panoramaStatus');
const title = document.querySelector('#panoramaTitle');
let catalogue = {};
let cleanup = () => {};

const params = new URLSearchParams(location.search);
let locationKey = params.get('lote')?.split('-')[0] || params.get('manzana') || (params.get('vista') === 'parque' ? 'PARQUE' : '');

function update() {
  const photo = catalogue[locationKey];
  picker.hidden = !photo;
  if (photo) button.textContent = 'Ver en 360° · ' + photo.label;
}

document.addEventListener('morada:panorama-location', event => {
  locationKey = event.detail;
  update();
});
fetch('panoramas.json').then(response => response.ok ? response.json() : {})
  .then(data => {
    catalogue = Object.fromEntries(Object.entries(data).filter(([block, photo]) =>
      /^(?:[A-K]|PARQUE|PORTICO)$/.test(block) && typeof photo?.label === 'string' && typeof photo?.file === 'string' &&
      /^assets\/panoramas\/[\w-]+\.(?:jpe?g|webp|png)$/i.test(photo.file)
    ));
    update();
  }).catch(() => {});

button.addEventListener('click', () => {
  const photo = catalogue[locationKey];
  if (!photo) return;
  dialog.showModal();
  dialog.requestFullscreen?.().catch(() => {});
  showPhoto(photo);
});
dialog.addEventListener('close', () => {
  if (document.fullscreenElement === dialog) document.exitFullscreen().catch(() => {});
  cleanup();
  cleanup = () => {};
  stage.replaceChildren();
  button.focus();
});

function showPhoto(photo) {
  title.textContent = 'Foto 360° · ' + photo.label;
  status.textContent = 'Cargando foto…';
  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({antialias:true});
  } catch {
    status.textContent = 'Este navegador no pudo abrir el visor 360°.';
    return;
  }
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(65, 1, .01, 10);
  camera.position.set(0, 0, .1);
  const canvas = renderer.domElement;
  canvas.tabIndex = 0;
  canvas.setAttribute('aria-label', 'Vista panorámica. Arrastra o usa las flechas para mirar.');
  stage.append(canvas);
  const controls = new OrbitControls(camera, canvas);
  controls.enablePan = false;
  controls.enableZoom = false;
  const render = () => renderer.render(scene, camera);
  controls.addEventListener('change', render);
  canvas.addEventListener('keydown', event => {
    if (!['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(event.key)) return;
    event.preventDefault();
    const orbit = new THREE.Spherical().setFromVector3(camera.position);
    if (event.key === 'ArrowLeft') orbit.theta -= .15;
    if (event.key === 'ArrowRight') orbit.theta += .15;
    if (event.key === 'ArrowUp') orbit.phi += .12;
    if (event.key === 'ArrowDown') orbit.phi -= .12;
    camera.position.setFromSpherical(orbit.makeSafe());
    controls.update();
  });
  const resize = new ResizeObserver(() => {
    const {clientWidth: width, clientHeight: height} = stage;
    if (!width || !height) return;
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    renderer.setSize(width, height);
    render();
  });
  resize.observe(stage);
  let disposed = false;
  const texture = new THREE.TextureLoader().load(photo.file, loaded => {
    if (disposed) { loaded.dispose(); return; }
    loaded.mapping = THREE.EquirectangularReflectionMapping;
    loaded.colorSpace = THREE.SRGBColorSpace;
    scene.background = loaded;
    status.textContent = photo.date ? 'Foto del terreno · ' + photo.date : 'Foto real del terreno';
    render();
  }, undefined, () => {
    if (!disposed) status.textContent = 'No se pudo cargar la foto de esta ubicación.';
  });
  cleanup = () => {
    disposed = true;
    resize.disconnect();
    controls.dispose();
    texture.dispose();
    renderer.dispose();
    renderer.forceContextLoss();
  };
}
