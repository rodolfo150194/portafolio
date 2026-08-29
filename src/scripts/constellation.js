// Neural constellation scene: a lazily-loaded three.js particle sphere used as the
// hero background. Registered as a vanilla custom element so it needs no client:*
// framework directive — only a <script type="module"> import from the host Astro
// component. See sdd/hero-neural-terminal-redesign design doc for scene parameters.

const POINT_COUNT = 820;
const SPHERE_RADIUS = 2.7;
const POINT_COLOR = 0xb6ff5e;
const POINT_SIZE = 0.038;
const POINT_OPACITY = 0.95;
const EDGE_COLOR = 0x3ee9b0;
const EDGE_OPACITY = 0.2;
const EDGE_MAX_DISTANCE = 0.46;
const EDGE_NEIGHBOR_SPAN = 7;
const CORE_RADIUS = 1.4;
const CORE_DETAIL = 1;
const CORE_COLOR = 0xffffff;
const CORE_OPACITY = 0.13;
const CAMERA_FOV = 50;
const CAMERA_NEAR = 0.1;
const CAMERA_FAR = 100;
const CAMERA_Z = 7.4;
const POINTER_SMOOTHING = 0.045;
const MAX_PIXEL_RATIO = 2;

/**
 * Builds the scene, camera, and per-frame update logic. Mirrors the reference
 * scene-constellation.js mock (design handoff), ported to ES module `three`.
 */
function buildScene(THREE, aspect) {
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(CAMERA_FOV, aspect, CAMERA_NEAR, CAMERA_FAR);
  camera.position.set(0, 0, CAMERA_Z);

  const positions = new Float32Array(POINT_COUNT * 3);
  const basePoints = [];
  for (let i = 0; i < POINT_COUNT; i++) {
    const y = 1 - (i / (POINT_COUNT - 1)) * 2;
    const radiusAtY = Math.sqrt(Math.max(0, 1 - y * y));
    const theta = i * 2.39996;
    const point = new THREE.Vector3(
      Math.cos(theta) * radiusAtY,
      y,
      Math.sin(theta) * radiusAtY
    ).multiplyScalar(SPHERE_RADIUS);
    basePoints.push(point);
    point.toArray(positions, i * 3);
  }

  const pointsGeometry = new THREE.BufferGeometry();
  pointsGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  const pointsMaterial = new THREE.PointsMaterial({
    color: POINT_COLOR,
    size: POINT_SIZE,
    transparent: true,
    opacity: POINT_OPACITY,
  });
  const points = new THREE.Points(pointsGeometry, pointsMaterial);

  const edgeVertices = [];
  for (let i = 0; i < POINT_COUNT; i++) {
    for (let j = i + 1; j < Math.min(i + EDGE_NEIGHBOR_SPAN, POINT_COUNT); j++) {
      if (basePoints[i].distanceTo(basePoints[j]) < EDGE_MAX_DISTANCE) {
        edgeVertices.push(basePoints[i], basePoints[j]);
      }
    }
  }
  const edgesGeometry = new THREE.BufferGeometry().setFromPoints(edgeVertices);
  const edgesMaterial = new THREE.LineBasicMaterial({
    color: EDGE_COLOR,
    transparent: true,
    opacity: EDGE_OPACITY,
  });
  const edges = new THREE.LineSegments(edgesGeometry, edgesMaterial);

  const coreGeometry = new THREE.EdgesGeometry(
    new THREE.IcosahedronGeometry(CORE_RADIUS, CORE_DETAIL)
  );
  const coreMaterial = new THREE.LineBasicMaterial({
    color: CORE_COLOR,
    transparent: true,
    opacity: CORE_OPACITY,
  });
  const core = new THREE.LineSegments(coreGeometry, coreMaterial);

  const group = new THREE.Group();
  group.add(points, edges, core);
  scene.add(group);

  return {
    scene,
    camera,
    disposables: {
      geometries: [pointsGeometry, edgesGeometry, coreGeometry],
      materials: [pointsMaterial, edgesMaterial, coreMaterial],
    },
    update(t, pointer) {
      group.rotation.y = t * 0.11 + pointer.x * 0.45;
      group.rotation.x = -pointer.y * 0.3 + Math.sin(t * 0.2) * 0.07;
      core.rotation.y = -t * 0.3;
      core.rotation.x = t * 0.18;
      const attr = pointsGeometry.attributes.position;
      for (let i = 0; i < POINT_COUNT; i++) {
        const base = basePoints[i];
        const scale = 1 + Math.sin(t * 1.1 + i * 0.055) * 0.025;
        attr.setXYZ(i, base.x * scale, base.y * scale, base.z * scale);
      }
      attr.needsUpdate = true;
    },
  };
}

const NARROW_VIEWPORT_QUERY = '(max-width: 639px)';

function prefersReducedMotion() {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

function isNarrowViewport() {
  return window.matchMedia(NARROW_VIEWPORT_QUERY).matches;
}

function supportsWebGL() {
  try {
    const canvas = document.createElement('canvas');
    return Boolean(
      window.WebGLRenderingContext &&
        (canvas.getContext('webgl') || canvas.getContext('experimental-webgl'))
    );
  } catch {
    return false;
  }
}

class SceneConstellationElement extends HTMLElement {
  connectedCallback() {
    if (this._mounted) return;
    this._mounted = true;

    if (prefersReducedMotion() || !supportsWebGL() || isNarrowViewport()) {
      this.setAttribute('data-fallback', '');
      return;
    }

    this._mount();
  }

  async _mount() {
    const THREE = await import('three');
    if (!this.isConnected) return;

    const width = this.clientWidth || 900;
    const height = this.clientHeight || 520;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, MAX_PIXEL_RATIO));
    renderer.setSize(width, height);
    renderer.domElement.style.cssText = 'display:block;width:100%;height:100%';
    this.appendChild(renderer.domElement);

    const api = buildScene(THREE, width / height);

    const pointer = { x: 0, y: 0, tx: 0, ty: 0 };
    const onPointerMove = (event) => {
      const rect = this.getBoundingClientRect();
      if (!rect.width) return;
      pointer.tx = ((event.clientX - rect.left) / rect.width - 0.5) * 2;
      pointer.ty = ((event.clientY - rect.top) / rect.height - 0.5) * 2;
    };
    window.addEventListener('pointermove', onPointerMove);

    let rafId = null;
    let running = false;
    const clock = new THREE.Clock();

    const loop = () => {
      rafId = requestAnimationFrame(loop);
      pointer.x += (pointer.tx - pointer.x) * POINTER_SMOOTHING;
      pointer.y += (pointer.ty - pointer.y) * POINTER_SMOOTHING;
      api.update(clock.getElapsedTime(), pointer);
      renderer.render(api.scene, api.camera);
    };

    const start = () => {
      if (running) return;
      running = true;
      clock.start();
      loop();
    };

    const stop = () => {
      running = false;
      if (rafId !== null) cancelAnimationFrame(rafId);
      rafId = null;
    };

    const intersectionObserver = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (entry && entry.isIntersecting && document.visibilityState === 'visible') {
          start();
        } else {
          stop();
        }
      },
      { threshold: 0 }
    );
    intersectionObserver.observe(this);

    const onVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        stop();
      } else if (this.isConnected) {
        start();
      }
    };
    document.addEventListener('visibilitychange', onVisibilityChange);

    const resizeObserver = new ResizeObserver(() => {
      const w = this.clientWidth;
      const h = this.clientHeight;
      if (!w || !h) return;
      renderer.setSize(w, h);
      api.camera.aspect = w / h;
      api.camera.updateProjectionMatrix();
    });
    resizeObserver.observe(this);

    this._dispose = () => {
      stop();
      intersectionObserver.disconnect();
      resizeObserver.disconnect();
      window.removeEventListener('pointermove', onPointerMove);
      document.removeEventListener('visibilitychange', onVisibilityChange);
      api.disposables.geometries.forEach((geometry) => geometry.dispose());
      api.disposables.materials.forEach((material) => material.dispose());
      renderer.dispose();
      if (typeof renderer.forceContextLoss === 'function') renderer.forceContextLoss();
      if (renderer.domElement.parentNode === this) this.removeChild(renderer.domElement);
    };
  }

  disconnectedCallback() {
    if (this._dispose) {
      this._dispose();
      this._dispose = null;
    }
  }
}

export function defineConstellationElement(tag = 'scene-constellation') {
  if (customElements.get(tag)) return;
  customElements.define(tag, SceneConstellationElement);
}
